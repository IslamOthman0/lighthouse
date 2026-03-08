#!/usr/bin/env node
/**
 * Generates PWA icons from icon.jpg source image.
 * Run: node generate-icons.cjs
 *
 * Uses sharp for high-quality resizing from the source image.
 * The source image (icon.jpg) has the lighthouse on a green background
 * designed to crop cleanly at all sizes.
 */

'use strict';
const sharp    = require('sharp');
const path     = require('path');
const fs       = require('fs');

const SOURCE = path.join(__dirname, 'icon.jpg');
const OUT    = path.join(__dirname, 'public');

// Crop region from icon.jpg: zero-padding crop
// Left/right = beam tips (X 175–562), bottom = tower base (Y 742), square = 388px
// Top is derived: 742 - 388 + 1 = 355 (gives spire breathing room above)
const CROP = { left: 175, top: 355, width: 388, height: 388 };

// All icon sizes needed for PWA, mobile, and desktop
const JOBS = [
  // PWA manifest icons
  { file: 'icon-192x192.png',          size: 192 },
  { file: 'icon-512x512.png',          size: 512 },
  { file: 'icon-maskable-512x512.png', size: 512, maskable: true },
  // Apple
  { file: 'apple-touch-icon.png',      size: 180 },
  // Favicon (small)
  { file: 'favicon-32x32.png',         size: 32 },
  { file: 'favicon-16x16.png',         size: 16 },
];

async function generate() {
  if (!fs.existsSync(SOURCE)) {
    console.error('ERROR: icon.jpg not found in project root');
    process.exit(1);
  }

  const meta = await sharp(SOURCE).metadata();
  console.log(`Source: icon.jpg (${meta.width}×${meta.height})`);
  console.log(`Crop: ${CROP.width}×${CROP.height} from (${CROP.left},${CROP.top})\n`);

  for (const { file, size, maskable } of JOBS) {
    // Start with the tight crop of the lighthouse
    let img = sharp(SOURCE).extract(CROP);

    // Same resize for both regular and maskable — beam tips and base at edges
    img = img.resize(size, size, { fit: 'cover', position: 'centre' });

    const outPath = path.join(OUT, file);
    await img.png({ quality: 100, compressionLevel: 9 }).toFile(outPath);
    const stat = fs.statSync(outPath);
    console.log(`✓  ${file.padEnd(30)} ${size}×${size}  ${(stat.size / 1024).toFixed(1)} KB`);
  }

  // Generate a proper multi-size ICO file (16, 32, 48) for Windows taskbar
  // ICO format: header + directory entries + PNG data blobs
  const icoSizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    icoSizes.map(s => sharp(SOURCE).extract(CROP).resize(s, s).png().toBuffer())
  );

  // ICO header: reserved(2) + type=1(2) + count(2)
  const count = icoSizes.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0,   0); // reserved
  header.writeUInt16LE(1,   2); // type: ICO
  header.writeUInt16LE(count, 4);

  // Directory entries (16 bytes each)
  const dirSize = count * 16;
  const dirs = Buffer.alloc(dirSize);
  let dataOffset = 6 + dirSize;

  for (let i = 0; i < count; i++) {
    const s   = icoSizes[i];
    const sz  = pngBuffers[i].length;
    const d   = dirs;
    const base = i * 16;
    d.writeUInt8(s === 256 ? 0 : s, base + 0);  // width  (0 = 256)
    d.writeUInt8(s === 256 ? 0 : s, base + 1);  // height (0 = 256)
    d.writeUInt8(0,  base + 2);  // palette colors
    d.writeUInt8(0,  base + 3);  // reserved
    d.writeUInt16LE(1, base + 4); // color planes
    d.writeUInt16LE(32, base + 6); // bits per pixel
    d.writeUInt32LE(sz, base + 8); // data size
    d.writeUInt32LE(dataOffset, base + 12); // data offset
    dataOffset += sz;
  }

  const icoBuffer = Buffer.concat([header, dirs, ...pngBuffers]);
  fs.writeFileSync(path.join(OUT, 'favicon.ico'), icoBuffer);

  const icoStat = fs.statSync(path.join(OUT, 'favicon.ico'));
  console.log(`✓  ${'favicon.ico'.padEnd(30)} 16+32+48px  ${(icoStat.size / 1024).toFixed(1)} KB`);

  console.log('\nDone. All icons generated from icon.jpg');
}

generate().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
