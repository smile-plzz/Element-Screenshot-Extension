import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal PNG generator using Node.js zlib
function createPng(size) {
  const width = size;
  const height = size;

  // Buffer for scanlines: (1 filter byte + width * 4 RGBA bytes) * height
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(rowSize * height);

  const center = size / 2;
  const radius = size * 0.44;
  const innerRadius = size * 0.18;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      const dx = x - center + 0.5;
      const dy = y - center + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Icon Design: Rounded box / camera aperture with crosshair
      const cornerRadius = size * 0.22;
      const boxDistX = Math.max(0, Math.abs(dx) - (center - cornerRadius));
      const boxDistY = Math.max(0, Math.abs(dy) - (center - cornerRadius));
      const isInsideBox = Math.sqrt(boxDistX * boxDistX + boxDistY * boxDistY) <= cornerRadius;

      if (isInsideBox) {
        // Outer box color: #0284c7 (rgb: 2, 132, 199)
        let r = 2;
        let g = 132;
        let b = 199;
        let a = 255;

        // Inner circle cutout or white ring
        if (dist >= innerRadius - 1.5 && dist <= innerRadius + 1.5) {
          // White targeting ring
          r = 255;
          g = 255;
          b = 255;
        } else if (dist < innerRadius - 1.5) {
          // Dark lens center: #0f172a
          r = 15;
          g = 23;
          b = 42;
        }

        // Crosshairs: 1px line at center
        const crosshairThickness = Math.max(1, Math.round(size * 0.05));
        const onCrosshairX = Math.abs(dx) <= crosshairThickness / 2 && dist < radius;
        const onCrosshairY = Math.abs(dy) <= crosshairThickness / 2 && dist < radius;
        if (onCrosshairX || onCrosshairY) {
          if (dist > innerRadius + 2 && dist < radius - 1) {
            r = 255;
            g = 255;
            b = 255;
          }
        }

        raw[pixelOffset] = r;
        raw[pixelOffset + 1] = g;
        raw[pixelOffset + 2] = b;
        raw[pixelOffset + 3] = a;
      } else {
        // Transparent outside
        raw[pixelOffset] = 0;
        raw[pixelOffset + 1] = 0;
        raw[pixelOffset + 2] = 0;
        raw[pixelOffset + 3] = 0;
      }
    }
  }

  // Deflate compressed IDAT chunk data
  const compressed = zlib.deflateSync(raw, { level: 9 });

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // Helper for CRC32
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const chunk = Buffer.alloc(12 + len);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const typeAndData = chunk.subarray(4, 8 + len);
    const crc = crc32(typeAndData);
    chunk.writeUInt32BE(crc, 8 + len);
    return chunk;
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Non-interlaced
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve(__dirname, '../public/icons');
fs.mkdirSync(iconsDir, { recursive: true });

const sizes = [16, 32, 48, 128];
for (const s of sizes) {
  const png = createPng(s);
  const outPath = path.join(iconsDir, `icon${s}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${png.length} bytes)`);
}
