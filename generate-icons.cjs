#!/usr/bin/env node
/**
 * Generates PWA icons for Lighthouse Dashboard.
 * Run: node generate-icons.js
 * No external dependencies — uses only Node.js built-ins.
 */

const fs = require('fs');
const zlib = require('zlib');

// ── PNG helpers ──────────────────────────────────────────────────────────────

const crcTable = (() => {
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
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function encodePNG(width, height, rgbPixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);  // bit depth
  ihdrData.writeUInt8(2, 9);  // RGB
  // compression/filter/interlace = 0

  // Build raw scanlines (filter byte 0 + RGB per pixel)
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 3;
      const dst = y * (1 + width * 3) + 1 + x * 3;
      raw[dst]     = rgbPixels[src];
      raw[dst + 1] = rgbPixels[src + 1];
      raw[dst + 2] = rgbPixels[src + 2];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon drawing ─────────────────────────────────────────────────────────────

/**
 * Draws the Lighthouse icon onto an RGB pixel array.
 * @param {number} size - Canvas size in pixels
 * @param {number} safeZoneRatio - 1.0 = full canvas, 0.8 = maskable safe zone
 */
function drawLighthouse(size, safeZoneRatio = 1.0) {
  const pixels = Buffer.alloc(size * size * 3);

  // Background: deep navy #0a0e1a
  for (let i = 0; i < pixels.length; i += 3) { pixels[i] = 10; pixels[i+1] = 14; pixels[i+2] = 26; }

  const cx = size / 2;
  const cy = size / 2;
  const s  = (size / 2) * safeZoneRatio; // coordinate scale

  function setPixel(x, y, r, g, b) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 3;
    pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b;
  }

  function fillRect(x0, y0, x1, y1, r, g, b) {
    for (let y = Math.round(y0); y <= Math.round(y1); y++)
      for (let x = Math.round(x0); x <= Math.round(x1); x++)
        setPixel(x, y, r, g, b);
  }

  function fillCircle(x0, y0, radius, r, g, b) {
    const r2 = radius * radius;
    const x0r = Math.round(x0), y0r = Math.round(y0), rad = Math.ceil(radius);
    for (let dy = -rad; dy <= rad; dy++)
      for (let dx = -rad; dx <= rad; dx++)
        if (dx*dx + dy*dy <= r2) setPixel(x0r + dx, y0r + dy, r, g, b);
  }

  function fillTrapezoid(topY, botY, topHalfW, botHalfW, r, g, b) {
    for (let y = Math.round(topY); y <= Math.round(botY); y++) {
      const t = (y - topY) / (botY - topY);
      const hw = topHalfW + (botHalfW - topHalfW) * t;
      fillRect(cx - hw, y, cx + hw, y, r, g, b);
    }
  }

  // ── Lighthouse anatomy (coordinates relative to centre, scaled by s) ──

  // 1. Beam rays (faint yellow glow behind lantern)
  const rayY  = cy - 0.62 * s;
  const rayR  = 0.36 * s;
  for (let angle = -60; angle <= 60; angle += 6) {
    const rad = (angle * Math.PI) / 180;
    for (let d = rayR; d < rayR + 0.28 * s; d += 1) {
      const bx = cx + Math.sin(rad) * d;
      const by = rayY - Math.cos(rad) * d;
      const fade = 1 - (d - rayR) / (0.28 * s);
      const bright = Math.round(60 * fade);
      setPixel(bx, by, bright, Math.round(bright * 0.9), 0);
    }
  }

  // 2. Tower body (slightly tapered trapezoid, white/light-gray stripes)
  const towerTop    = cy - 0.50 * s;
  const towerBot    = cy + 0.38 * s;
  const towerTopHW  = 0.085 * s;
  const towerBotHW  = 0.135 * s;
  const stripes     = 6;
  for (let y = Math.round(towerTop); y <= Math.round(towerBot); y++) {
    const t  = (y - towerTop) / (towerBot - towerTop);
    const hw = towerTopHW + (towerBotHW - towerTopHW) * t;
    const stripe = Math.floor(t * stripes) % 2;
    const v = stripe ? 255 : 210;
    fillRect(cx - hw, y, cx + hw, y, v, v, v);
  }

  // 3. Door (dark opening near base of tower)
  const doorW = towerBotHW * 0.5;
  const doorH = 0.08 * s;
  const doorTopY = towerBot - doorH - 0.01 * s;
  fillRect(cx - doorW, doorTopY, cx + doorW, towerBot, 40, 40, 60);

  // 4. Balcony rail (thin horizontal band)
  const balconyY = towerTop + 0.02 * s;
  fillRect(cx - towerTopHW * 1.6, balconyY, cx + towerTopHW * 1.6, balconyY + 0.025 * s, 180, 180, 190);

  // 5. Lantern room (rectangle atop tower)
  const lanternH  = 0.14 * s;
  const lanternHW = 0.115 * s;
  const lanternTop = towerTop - lanternH;
  fillRect(cx - lanternHW, lanternTop, cx + lanternHW, towerTop, 200, 200, 210);

  // 6. Light bulb (warm yellow circle inside lantern)
  fillCircle(cx, lanternTop + lanternH * 0.5, 0.06 * s, 255, 230, 80);

  // 7. Dome cap (darker oval on top of lantern)
  fillTrapezoid(lanternTop - 0.04 * s, lanternTop, lanternHW * 0.8, lanternHW, 160, 160, 170);

  // 8. Base / platform
  const baseHW = towerBotHW * 1.8;
  const baseH  = 0.06 * s;
  fillRect(cx - baseHW, towerBot, cx + baseHW, towerBot + baseH, 180, 180, 190);

  // 9. Sea waves (two arcs below base)
  const waveY = towerBot + baseH + 0.04 * s;
  for (let wx = Math.round(cx - baseHW * 1.2); wx <= Math.round(cx + baseHW * 1.2); wx++) {
    const woff = Math.sin(((wx - cx) / (baseHW * 0.6)) * Math.PI) * 0.04 * s;
    setPixel(wx, Math.round(waveY + woff),         100, 160, 220);
    setPixel(wx, Math.round(waveY + woff + 0.03*s), 80, 130, 200);
  }

  return pixels;
}

// ── Generate all icon files ──────────────────────────────────────────────────

const OUT = `${__dirname}/public`;

const jobs = [
  { file: 'icon-192x192.png',         size: 192, safe: 1.0 },
  { file: 'icon-512x512.png',         size: 512, safe: 1.0 },
  { file: 'icon-maskable-512x512.png',size: 512, safe: 0.8 },  // 80 % safe zone
  { file: 'apple-touch-icon.png',     size: 180, safe: 1.0 },
];

for (const { file, size, safe } of jobs) {
  const pixels = drawLighthouse(size, safe);
  const png    = encodePNG(size, size, pixels);
  fs.writeFileSync(`${OUT}/${file}`, png);
  console.log(`✓ ${file}  (${size}×${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}

console.log('\nDone. All icons written to public/');
