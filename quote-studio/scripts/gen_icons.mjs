/**
 * Quote Studio — PWA 图标生成（零依赖）
 *
 * 生成：public/icons/icon-192.png、public/icons/icon-512.png、public/favicon.ico
 * 用纯 Node 内置 zlib 手写 PNG 编码（不引 canvas / sharp 等依赖）。
 *
 * 设计：珊瑚底色 + 白色圆环（风格化的「目标 / Q」占位图标）。
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'public', 'icons');

/* ---------- CRC32 ---------- */
function makeCrcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const CRC = makeCrcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC[(c ^ buf[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function makePng(size) {
  // RGBA 像素缓冲
  const px = new Uint8Array(size * size * 4);
  const bg = [212, 59, 58]; // coral-500
  const white = [255, 255, 255];
  const accent = [194, 51, 47]; // coral-700
  const c = size / 2;
  const rOuter = size * 0.34;
  const rInner = size * 0.22;
  const rDot = size * 0.05;

  const inCircle = (x, y, r) => Math.hypot(x - c + 0.5, y - c + 0.5) <= r;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let col = bg;
      let a = 255;
      if (inCircle(x, y, rOuter)) col = white;
      if (inCircle(x, y, rInner)) col = accent;
      if (inCircle(x, y, rDot)) col = white;
      px[i] = col[0];
      px[i + 1] = col[1];
      px[i + 2] = col[2];
      px[i + 3] = a;
    }
  }

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  const pxBuf = Buffer.from(px.buffer, px.byteOffset, px.byteLength);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    pxBuf.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw);
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeIco(pngBuf, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size; // width (0 => 256)
  entry[1] = size >= 256 ? 0 : size; // height
  entry[2] = 0; // colors
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(pngBuf.length, 8); // bytes in resource
  entry.writeUInt32LE(22, 12); // offset (6 + 16)
  return Buffer.concat([header, entry, pngBuf]);
}

mkdirSync(OUT_DIR, { recursive: true });
const png192 = makePng(192);
const png512 = makePng(512);
writeFileSync(resolve(OUT_DIR, 'icon-192.png'), png192);
writeFileSync(resolve(OUT_DIR, 'icon-512.png'), png512);
writeFileSync(resolve(ROOT, 'public', 'favicon.ico'), makeIco(png192, 192));
console.log('[gen-icons] 已生成 icon-192.png / icon-512.png / favicon.ico');
