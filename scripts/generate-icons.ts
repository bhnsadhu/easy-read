import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Generates every raster brand asset from the single SVG mark. Idempotent.
const ROOT = path.resolve(import.meta.dirname, "..");
const MARK = path.join(ROOT, "public/brand/mark.svg");
const OUT = path.join(ROOT, "public/brand");
const ACCENT = "#0E6F63";

async function png(size: number, file: string, opts: { pad?: number } = {}) {
  const svg = await readFile(MARK);
  const inner = Math.round(size * (1 - (opts.pad ?? 0)));
  const tile = await sharp(svg).resize(inner, inner).png().toBuffer();
  const img = sharp({ create: { width: size, height: size, channels: 4, background: opts.pad ? ACCENT : { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([
    { input: tile, left: Math.round((size - inner) / 2), top: Math.round((size - inner) / 2) },
  ]);
  await img.png().toFile(path.join(OUT, file));
}

function ico(pngBytes: Buffer, size: number): Buffer {
  // ICO with one PNG-compressed entry (supported by every current browser).
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const dir = Buffer.alloc(16);
  dir.writeUInt8(size >= 256 ? 0 : size, 0);
  dir.writeUInt8(size >= 256 ? 0 : size, 1);
  dir.writeUInt8(0, 2);
  dir.writeUInt8(0, 3);
  dir.writeUInt16LE(1, 4);
  dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(pngBytes.length, 8);
  dir.writeUInt32LE(22, 12);
  return Buffer.concat([header, dir, pngBytes]);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await png(192, "icon-192.png");
  await png(512, "icon-512.png");
  await png(512, "icon-maskable-512.png", { pad: 0.2 });
  await png(180, "apple-touch-icon.png");
  await png(32, "favicon-32.png");
  const fav = await readFile(path.join(OUT, "favicon-32.png"));
  await writeFile(path.join(ROOT, "src/app/favicon.ico"), ico(fav, 32));
  await writeFile(path.join(ROOT, "src/app/apple-icon.png"), await readFile(path.join(OUT, "apple-touch-icon.png")));
  console.log("icons written");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
