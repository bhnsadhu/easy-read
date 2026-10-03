import sharp from "sharp";
import type { ExtractedDocument } from "@/lib/content/types";
import { IngestError } from "./errors";
import { LIMITS } from "./sniff";

export const IMAGE_MIN_EDGE_PX = 200;
export const IMAGE_MAX_PIXELS = 50_000_000;
export const IMAGE_JPEG_QUALITY = 85;

export type PreparedImage = {
  buffer: Buffer;
  mime: "image/jpeg";
  width: number;
  height: number;
};

// Auto-rotates from EXIF, downscales to a 2000 px long edge, converts to
// JPEG and strips metadata. Rejects tiny or absurdly large images.
export async function prepareImage(buf: Uint8Array): Promise<PreparedImage> {
  const input = Buffer.isBuffer(buf) ? buf : Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);

  let width: number;
  let height: number;
  try {
    const meta = await sharp(input, { limitInputPixels: false }).metadata();
    width = meta.width;
    height = meta.height;
  } catch (cause) {
    throw new IngestError("corrupt", { kind: "photo" }, { cause });
  }
  if (!width || !height) throw new IngestError("corrupt", { kind: "photo" });
  if (width * height > IMAGE_MAX_PIXELS) throw new IngestError("too_large", { kind: "photo" });
  if (Math.min(width, height) < IMAGE_MIN_EDGE_PX) throw new IngestError("too_small");

  try {
    const { data, info } = await sharp(input, { limitInputPixels: IMAGE_MAX_PIXELS })
      .rotate()
      .resize({ width: LIMITS.maxImagePixels, height: LIMITS.maxImagePixels, fit: "inside", withoutEnlargement: true })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: IMAGE_JPEG_QUALITY })
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, mime: "image/jpeg", width: info.width, height: info.height };
  } catch (cause) {
    throw new IngestError("corrupt", { kind: "photo" }, { cause });
  }
}

// Images never carry a text layer; they always go to vision.
export async function extractImage(buf: Uint8Array): Promise<{ doc: ExtractedDocument; prepared: PreparedImage }> {
  const prepared = await prepareImage(buf);
  const doc: ExtractedDocument = { text: "", pages: 1, needsVision: true, warnings: [] };
  return { doc, prepared };
}
