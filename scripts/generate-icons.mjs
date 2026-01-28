#!/usr/bin/env node
/**
 * Generate Tauri Icons
 *
 * Creates placeholder icons for Tauri desktop app.
 * For production, replace these with proper branded icons.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ICONS_DIR = join(ROOT, 'src-tauri', 'icons');

// Ensure icons directory exists
if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true });
}

/**
 * Create a simple PNG with a gradient background and "F" letter
 * This is a minimal implementation - for production use proper icon design tools
 */
function createPNG(size) {
  // PNG file structure
  const width = size;
  const height = size;

  // Create raw pixel data (RGBA)
  const pixels = Buffer.alloc(width * height * 4);

  // Generate a simple gradient with "F" shape
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Background gradient (dark blue to purple)
      const gradientRatio = (x + y) / (width + height);
      const r = Math.floor(30 + gradientRatio * 80);  // 30-110
      const g = Math.floor(20 + gradientRatio * 40);  // 20-60
      const b = Math.floor(80 + gradientRatio * 100); // 80-180

      // Draw "F" letter in white (centered, proportional to size)
      const margin = Math.floor(size * 0.2);
      const letterWidth = Math.floor(size * 0.4);
      const barHeight = Math.floor(size * 0.12);
      const stemWidth = Math.floor(size * 0.15);

      const inLetter =
        // Vertical stem
        (x >= margin && x < margin + stemWidth && y >= margin && y < height - margin) ||
        // Top horizontal bar
        (x >= margin && x < margin + letterWidth && y >= margin && y < margin + barHeight) ||
        // Middle horizontal bar
        (x >= margin && x < margin + letterWidth * 0.7 &&
         y >= Math.floor(height / 2 - barHeight / 2) &&
         y < Math.floor(height / 2 + barHeight / 2));

      if (inLetter) {
        // White letter
        pixels[idx] = 255;     // R
        pixels[idx + 1] = 255; // G
        pixels[idx + 2] = 255; // B
        pixels[idx + 3] = 255; // A
      } else {
        pixels[idx] = r;       // R
        pixels[idx + 1] = g;   // G
        pixels[idx + 2] = b;   // B
        pixels[idx + 3] = 255; // A
      }
    }
  }

  // Create PNG file
  return createPNGBuffer(width, height, pixels);
}

/**
 * Create a minimal valid PNG buffer
 */
function createPNGBuffer(width, height, pixels) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdr = createIHDRChunk(width, height);

  // IDAT chunk (image data)
  const idat = createIDATChunk(width, height, pixels);

  // IEND chunk
  const iend = createIENDChunk();

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createIHDRChunk(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;  // bit depth
  data[9] = 6;  // color type (RGBA)
  data[10] = 0; // compression
  data[11] = 0; // filter
  data[12] = 0; // interlace

  return createChunk('IHDR', data);
}

function createIDATChunk(width, height, pixels) {
  // Add filter byte (0 = None) to each row
  const rowSize = width * 4 + 1;
  const filtered = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    filtered[y * rowSize] = 0; // Filter type: None
    pixels.copy(filtered, y * rowSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  // Compress with zlib (using deflate)
  const compressed = deflateSync(filtered, { level: 9 });

  return createChunk('IDAT', compressed);
}

function createIENDChunk() {
  return createChunk('IEND', Buffer.alloc(0));
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation for PNG
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crc32Table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ 0xffffffff;
}

// Pre-computed CRC32 table
const crc32Table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crc32Table[i] = c;
}

/**
 * Create ICO file from PNG data
 * ICO format: Header + Directory entries + Image data
 */
function createICO(pngBuffers) {
  // ICO Header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);           // Reserved
  header.writeUInt16LE(1, 2);           // Type (1 = ICO)
  header.writeUInt16LE(pngBuffers.length, 4); // Number of images

  // Directory entries (16 bytes each)
  const entries = [];
  let offset = 6 + pngBuffers.length * 16;

  for (const { size, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;  // Width (0 = 256)
    entry[1] = size >= 256 ? 0 : size;  // Height (0 = 256)
    entry[2] = 0;                        // Color palette
    entry[3] = 0;                        // Reserved
    entry.writeUInt16LE(1, 4);          // Color planes
    entry.writeUInt16LE(32, 6);         // Bits per pixel
    entry.writeUInt32LE(data.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12);    // Offset to image data

    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.data)]);
}

// Generate icons
console.log('🎨 Generating Tauri icons...');

const sizes = [32, 128, 256, 512];
const pngFiles = [];

for (const size of sizes) {
  const png = createPNG(size);
  const filename = size === 512 ? 'icon.png' :
                   size === 256 ? '128x128@2x.png' :
                   `${size}x${size}.png`;

  writeFileSync(join(ICONS_DIR, filename), png);
  console.log(`  ✓ Created ${filename}`);

  pngFiles.push({ size, data: png });
}

// Create ICO file with multiple sizes
const ico = createICO(pngFiles.filter(p => [32, 128, 256].includes(p.size)));
writeFileSync(join(ICONS_DIR, 'icon.ico'), ico);
console.log('  ✓ Created icon.ico');

console.log('\n✅ All icons generated in src-tauri/icons/');
console.log('   For production, replace these with proper branded icons.');
