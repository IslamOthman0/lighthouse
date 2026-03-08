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
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const SOURCE = path.join(__dirname, 'icon.jpg');
const OUT    = path.join(__dirname, 'public');

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

  const sourceImg = sharp(SOURCE);
  const meta = await sourceImg.metadata();
  console.log(`Source: icon.jpg (${meta.width}×${meta.height})\n`);

  for (const { file, size, maskable } of JOBS) {
    let img = sharp(SOURCE);

    if (maskable) {
      // For maskable icons, add 10% padding around the icon
      // so the safe zone (inner 80%) contains the full design
      const padded = Math.round(size * 0.1);
      const innerSize = size - padded * 2;

      img = img
        .resize(innerSize, innerSize, { fit: 'cover', position: 'centre' })
        .extend({
          top: padded,
          bottom: padded,
          left: padded,
          right: padded,
          background: '#1e4029' // match the dark green BG
        });
    } else {
      img = img.resize(size, size, { fit: 'cover', position: 'centre' });
    }

    const outPath = path.join(OUT, file);
    await img.png({ quality: 100, compressionLevel: 9 }).toFile(outPath);
    const stat = fs.statSync(outPath);
    console.log(`✓  ${file.padEnd(30)} ${size}×${size}  ${(stat.size / 1024).toFixed(1)} KB`);
  }

  // Generate ICO favicon from 32x32 and 16x16
  // Sharp doesn't support ICO natively, so we'll just copy the 32x32 as favicon
  const favicon32 = path.join(OUT, 'favicon-32x32.png');
  const faviconIco = path.join(OUT, 'favicon.ico');
  // Use the 32x32 PNG as the favicon (browsers handle PNG favicons fine)
  fs.copyFileSync(favicon32, faviconIco);
  console.log(`✓  ${'favicon.ico'.padEnd(30)} (copy of 32x32)`);

  console.log('\nDone. All icons generated from icon.jpg');
}

generate().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
