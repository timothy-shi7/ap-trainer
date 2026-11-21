import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(size, pixel) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((size * 4 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y += 1) {
    raw[o] = 0; // filter none
    o += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x, y, size);
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
      o += 4;
    }
  }

  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const W = 0x02;
const G = 0x06;
const B = 0x17;

function pixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;

  // rounded-rect background mask
  const radius = size * 0.22;
  const dx = Math.max(Math.abs(x + 0.5 - cx) - (cx - radius), 0);
  const dy = Math.max(Math.abs(y + 0.5 - cy) - (cy - radius), 0);
  const inside = Math.sqrt(dx * dx + dy * dy) <= radius;

  if (!inside) return [0, 0, 0, 0];

  // radial gradient bg from #0f172a -> #020617
  const t = Math.min(1, Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / (size * 0.7));
  let br = Math.round(0x0f + (W - 0x0f) * t);
  let bg = Math.round(0x17 + (G - 0x17) * t);
  let bb = Math.round(0x2a + (B - 0x2a) * t);

  // parabola arc: y = cy - k*(x-cx)^2 opening downward, apex near top
  const nx = (x + 0.5 - cx) / (size * 0.5); // -1..1
  const arcY = size * 0.28 + (size * 0.42) * nx * nx; // U shape
  const thickness = size * 0.05;
  const onArc =
    Math.abs(y + 0.5 - arcY) <= thickness && Math.abs(nx) <= 0.85;

  // nodes
  const nodes = [
    [cx - size * 0.28, arcY_at(size, -0.56)],
    [cx + size * 0.28, arcY_at(size, 0.56)],
  ];
  let nodeHit = false;
  for (const [nxp, nyp] of nodes) {
    if (Math.hypot(x + 0.5 - nxp, y + 0.5 - nyp) <= size * 0.045) {
      nodeHit = true;
      br = 0x34;
      bg = 0xd3;
      bb = 0x99;
    }
  }

  // apex gold node
  const apexX = cx;
  const apexY = size * 0.28;
  let apexHit = false;
  if (Math.hypot(x + 0.5 - apexX, y + 0.5 - apexY) <= size * 0.055) {
    apexHit = true;
    br = 0xfb;
    bg = 0xbf;
    bb = 0x24;
  }

  if (onArc && !nodeHit && !apexHit) {
    br = 0x34;
    bg = 0xd3;
    bb = 0x99;
  }

  return [br, bg, bb, 255];
}

function arcY_at(size, nx) {
  return size * 0.28 + size * 0.42 * nx * nx;
}

writeFileSync(join(outDir, 'icon-192.png'), png(192, pixel));
writeFileSync(join(outDir, 'icon-512.png'), png(512, pixel));
console.log('icons written');