#!/usr/bin/env node
/**
 * Generates PWA icons for Lighthouse Dashboard.
 * Run: node generate-icons.cjs
 * No external dependencies — uses only Node.js built-ins.
 */

'use strict';
const fs   = require('fs');
const zlib = require('zlib');

// ── PNG encoder ──────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf  = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr.writeUInt8(8, 8); ihdr.writeUInt8(2, 9); // 8-bit RGB

  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0;                      // filter: None
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 3;
      const d = y * (1 + w * 3) + 1 + x * 3;
      raw[d] = rgb[s]; raw[d+1] = rgb[s+1]; raw[d+2] = rgb[s+2];
    }
  }
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

function makeCanvas(w, h, r, g, b) {
  const px = Buffer.alloc(w * h * 3);
  for (let i = 0; i < px.length; i += 3) { px[i]=r; px[i+1]=g; px[i+2]=b; }
  return px;
}

function plot(px, w, h, x, y, r, g, b) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const i = (y * w + x) * 3;
  px[i]=r; px[i+1]=g; px[i+2]=b;
}

function plotBlend(px, w, h, x, y, r, g, b, alpha) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const i = (y * w + x) * 3;
  px[i]   = Math.round(px[i]   * (1 - alpha) + r * alpha);
  px[i+1] = Math.round(px[i+1] * (1 - alpha) + g * alpha);
  px[i+2] = Math.round(px[i+2] * (1 - alpha) + b * alpha);
}

function fillRect(px, w, h, x0, y0, x1, y1, r, g, b) {
  for (let y = Math.round(y0); y <= Math.round(y1); y++)
    for (let x = Math.round(x0); x <= Math.round(x1); x++)
      plot(px, w, h, x, y, r, g, b);
}

function fillCircle(px, w, h, cx, cy, radius, r, g, b) {
  const r2 = radius * radius;
  const R  = Math.ceil(radius);
  const cxr = Math.round(cx), cyr = Math.round(cy);
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++)
      if (dx*dx + dy*dy <= r2) plot(px, w, h, cxr+dx, cyr+dy, r, g, b);
}

// Filled triangle via scan-line
function fillTriangle(px, w, h, ax, ay, bx, by, cx2, cy2, r, g, b) {
  const minY = Math.max(0, Math.round(Math.min(ay, by, cy2)));
  const maxY = Math.min(h-1, Math.round(Math.max(ay, by, cy2)));
  function xAtY(p1x, p1y, p2x, p2y, y) {
    if (p1y === p2y) return p1x;
    return p1x + (p2x - p1x) * (y - p1y) / (p2y - p1y);
  }
  const edges = [[ax,ay,bx,by],[bx,by,cx2,cy2],[cx2,cy2,ax,ay]];
  for (let y = minY; y <= maxY; y++) {
    const xs = edges
      .filter(([,y1,,y2]) => (y1 <= y && y <= y2) || (y2 <= y && y <= y1))
      .map(([x1,y1,x2,y2]) => xAtY(x1,y1,x2,y2,y));
    if (xs.length < 2) continue;
    const x0 = Math.round(Math.min(...xs));
    const x1 = Math.round(Math.max(...xs));
    for (let x = Math.max(0,x0); x <= Math.min(w-1,x1); x++)
      plot(px, w, h, x, y, r, g, b);
  }
}

// ── Lighthouse icon ──────────────────────────────────────────────────────────
//
//  Design (readable down to ~48 px on screen):
//  • Deep ocean-blue background  (#0055cc)  — clearly blue, never mistaken for black
//  • Wide amber beam fan above the lantern
//  • White tapered tower
//  • Bright golden lantern
//  • White platform/base
//
//  safeZoneRatio: 1.0 = use full canvas; 0.8 = 80% safe zone for maskable icons

function drawLighthouse(size, safeZoneRatio = 1.0) {
  // ── Background: ocean blue ──────────────────────────────────────────────
  const px = makeCanvas(size, size, 0, 73, 175);   // #0049AF - vivid ocean blue

  const cx = size * 0.5;
  const cy = size * 0.5;
  const s  = size * 0.5 * safeZoneRatio;           // scale unit

  // ── 1. Light beam (wide amber/gold fan) ────────────────────────────────
  // Triangle spreading 70° wide upward from lantern centre
  const lanternCY = cy - 0.54 * s;                 // lantern vertical centre
  const beamHalfAngle = 50 * Math.PI / 180;        // 50° each side = 100° fan
  const beamLen       = 0.72 * s;

  // Left ray tip, right ray tip, origin at lantern
  const blx = cx + Math.sin(-beamHalfAngle) * beamLen;
  const bly = lanternCY - Math.cos(beamHalfAngle) * beamLen;
  const brx = cx + Math.sin( beamHalfAngle) * beamLen;
  const bry = bly;

  fillTriangle(px, size, size, cx, lanternCY, blx, bly, brx, bry, 255, 200, 40);  // amber

  // Soften beam with gradient rows (blend with bg toward tip)
  for (let y = Math.round(bly); y < Math.round(lanternCY); y++) {
    const fade = (y - bly) / (lanternCY - bly);   // 0 at tip → 1 at lantern
    const alpha = 0.35 * (1 - fade);               // faint outer glow
    const halfW = Math.tan(beamHalfAngle) * (lanternCY - y) + 1;
    for (let x = Math.round(cx - halfW); x <= Math.round(cx + halfW); x++)
      plotBlend(px, size, size, x, y, 255, 210, 60, alpha);
  }

  // ── 2. Tower (tapered white trapezoid) ─────────────────────────────────
  const towerTop    = cy - 0.44 * s;
  const towerBot    = cy + 0.36 * s;
  const towerTopHW  = 0.09 * s;
  const towerBotHW  = 0.155 * s;

  for (let y = Math.round(towerTop); y <= Math.round(towerBot); y++) {
    const t  = (y - towerTop) / (towerBot - towerTop);
    const hw = towerTopHW + (towerBotHW - towerTopHW) * t;
    // Two alternating bands for a stripe pattern visible at larger sizes
    const stripe = Math.floor(t * 5) % 2;
    const v = stripe ? 255 : 230;
    fillRect(px, size, size, cx - hw, y, cx + hw, y, v, v, v);
  }

  // ── 3. Lantern room (golden circle) ────────────────────────────────────
  const lanternR = 0.13 * s;
  fillCircle(px, size, size, cx, lanternCY, lanternR, 255, 215, 0);   // gold

  // Bright white inner glow
  fillCircle(px, size, size, cx, lanternCY, lanternR * 0.5, 255, 255, 200);

  // Dark ring around lantern room
  for (let angle = 0; angle < 360; angle += 2) {
    const rad = angle * Math.PI / 180;
    const rx = cx + Math.cos(rad) * (lanternR + 1.5);
    const ry = lanternCY + Math.sin(rad) * (lanternR + 1.5);
    plot(px, size, size, rx, ry, 30, 60, 120);
  }

  // ── 4. Cap above lantern ────────────────────────────────────────────────
  const capTopY = lanternCY - lanternR - 0.06 * s;
  fillTriangle(
    px, size, size,
    cx, capTopY,
    cx - lanternR * 1.1, lanternCY - lanternR,
    cx + lanternR * 1.1, lanternCY - lanternR,
    220, 220, 230
  );

  // ── 5. Base platform ────────────────────────────────────────────────────
  const baseHW = towerBotHW * 2.0;
  const baseH  = 0.07 * s;
  fillRect(px, size, size, cx - baseHW, towerBot, cx + baseHW, towerBot + baseH, 220, 220, 230);

  // ── 6. Simple wave line ─────────────────────────────────────────────────
  const waveY  = towerBot + baseH + 0.05 * s;
  const waveAmp = 0.025 * s;
  const waveW  = baseHW * 1.4;
  for (let wx = Math.round(cx - waveW); wx <= Math.round(cx + waveW); wx++) {
    const wy = waveY + Math.sin((wx - cx) / (0.25 * s) * Math.PI) * waveAmp;
    fillRect(px, size, size, wx, wy, wx, wy + 0.03 * s, 100, 180, 255);
  }

  return px;
}

// ── Export all icon files ─────────────────────────────────────────────────────

const OUT = `${__dirname}/public`;

const JOBS = [
  { file: 'icon-192x192.png',          size: 192, safe: 1.0 },
  { file: 'icon-512x512.png',          size: 512, safe: 1.0 },
  { file: 'icon-maskable-512x512.png', size: 512, safe: 0.8 },
  { file: 'apple-touch-icon.png',      size: 180, safe: 1.0 },
];

for (const { file, size, safe } of JOBS) {
  const px  = drawLighthouse(size, safe);
  const png = encodePNG(size, size, px);
  fs.writeFileSync(`${OUT}/${file}`, png);
  console.log(`✓  ${file.padEnd(30)} ${size}×${size}  ${(png.length/1024).toFixed(1)} KB`);
}

console.log('\nDone.');
