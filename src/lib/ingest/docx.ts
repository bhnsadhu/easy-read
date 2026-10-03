import mammoth from "mammoth";
import type { ExtractedDocument } from "@/lib/content/types";
import { IngestError } from "./errors";
import { firstHeading, htmlToText } from "./html-text";

// Uncompressed size we are willing to unpack from a .docx (zip bomb guard).
export const DOCX_MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const DOCX_MAX_ENTRIES = 10_000;

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const ZIP64_MARKER = 0xffffffff;

export type ZipSummary = { entries: number; uncompressedBytes: number };

// Reads the zip central directory and sums the declared uncompressed sizes.
// Throws IngestError("corrupt") when the central directory cannot be found.
export function summariseZip(buf: Uint8Array): ZipSummary {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const len = buf.byteLength;
  // The end-of-central-directory record is 22 bytes plus a comment of up to 64 KiB.
  const minOffset = Math.max(0, len - 22 - 0xffff);
  let eocd = -1;
  for (let i = len - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new IngestError("corrupt", { kind: "document" });

  const entryCount = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (entryCount === 0xffff || centralSize === ZIP64_MARKER || centralOffset === ZIP64_MARKER) {
    // Zip64 archives are bigger than anything a reading should be.
    throw new IngestError("too_large", { kind: "document", limit: 50 });
  }
  if (entryCount > DOCX_MAX_ENTRIES) throw new IngestError("too_large", { kind: "document", limit: 50 });
  if (centralOffset + centralSize > len) throw new IngestError("corrupt", { kind: "document" });

  let pos = centralOffset;
  let total = 0;
  let seen = 0;
  while (seen < entryCount) {
    if (pos + 46 > len || view.getUint32(pos, true) !== SIG_CENTRAL) {
      throw new IngestError("corrupt", { kind: "document" });
    }
    const uncompressed = view.getUint32(pos + 24, true);
    if (uncompressed === ZIP64_MARKER) throw new IngestError("too_large", { kind: "document", limit: 50 });
    total += uncompressed;
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    pos += 46 + nameLen + extraLen + commentLen;
    seen++;
  }
  return { entries: entryCount, uncompressedBytes: total };
}

function toBuffer(buf: Uint8Array): Buffer {
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
}

export async function extractDocx(buf: Uint8Array): Promise<ExtractedDocument> {
  const summary = summariseZip(buf);
  if (summary.uncompressedBytes > DOCX_MAX_UNCOMPRESSED_BYTES) {
    throw new IngestError("too_large", { kind: "document", limit: 50 });
  }

  let html: string;
  try {
    const result = await mammoth.convertToHtml(
      { buffer: toBuffer(buf) },
      {
        ignoreEmptyParagraphs: true,
        // We only want text; drop image bytes instead of inlining them as data URIs.
        convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
      },
    );
    html = result.value;
  } catch (cause) {
    throw new IngestError("corrupt", { kind: "document" }, { cause });
  }

  const text = htmlToText(html);
  if (!text.trim()) throw new IngestError("empty");

  const warnings: string[] = [];
  if (/<table[\s>]/i.test(html)) {
    warnings.push("Tables were kept as plain rows. Check them before publishing.");
  }

  const doc: ExtractedDocument = { text, warnings };
  const title = firstHeading(text);
  if (title) doc.title = title;
  return doc;
}
