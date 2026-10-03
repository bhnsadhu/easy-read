import { fileTypeFromBuffer } from "file-type";
import { serverEnv } from "@/lib/env";

// Never trust the browser's File.type or the extension: sniff magic bytes
// and report when they disagree.

export type SniffKind = "pdf" | "docx" | "image" | "text" | "unsupported";

export type SniffResult = {
  kind: SniffKind;
  // The MIME type we believe the bytes actually are.
  mime: string;
  // True when the extension or the declared MIME type disagrees with the bytes.
  mismatch: boolean;
  // Teacher-facing explanation when kind is "unsupported".
  reason?: string;
};

function maxUploadBytes(): number {
  let mb = 25;
  try {
    mb = serverEnv().MAX_UPLOAD_MB;
  } catch {
    // Fall back to the default when the environment cannot be parsed.
  }
  return Math.round(mb * 1024 * 1024);
}

export const LIMITS = {
  maxUploadBytes: maxUploadBytes(),
  maxPdfPages: 40,
  // Long edge for images sent to vision.
  maxImagePixels: 2000,
} as const;

const IMAGE_EXTS = new Set(["jpg", "png", "webp", "gif"]);

const UNSUPPORTED_REASONS: Record<string, string> = {
  heic: "That's a HEIC photo, which we can't read yet. On iPhone, share it as a JPEG, or take a screenshot and upload that.",
  heif: "That's a HEIF photo, which we can't read yet. Share it as a JPEG, or take a screenshot and upload that.",
  cfb: "That looks like an older Office file (.doc, .xls, or .ppt). Save it as .docx or PDF and upload it again.",
  doc: "That looks like an older Word file (.doc). Save it as .docx or PDF and upload it again.",
  pptx: "That's a PowerPoint file. Export it as a PDF, or paste the text.",
  xlsx: "That's a spreadsheet. Paste the text you want students to read.",
  zip: "That's a zip archive. Upload the PDF, Word document, photo, or text file inside it.",
  rtf: "That's an RTF file. Save it as .docx or .txt and upload it again.",
  epub: "That's an EPUB. Copy the chapter you need and paste the text.",
  odt: "That's an OpenDocument file. Save it as .docx or PDF and upload it again.",
  tif: "That's a TIFF image. Save it as a JPEG or PNG and upload it again.",
  bmp: "That's a BMP image. Save it as a JPEG or PNG and upload it again.",
  svg: "That's an SVG drawing. Save it as a PNG, or paste the text.",
  avif: "That's an AVIF image. Save it as a JPEG or PNG and upload it again.",
};

const GENERIC_REASON =
  "We can't read that type of file. Upload a PDF, Word document, photo, or text file, or paste the text.";

function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
}

// What kind a file with this extension claims to be. undefined = no claim.
function kindFromExtension(ext: string): SniffKind | undefined {
  switch (ext) {
    case "pdf":
      return "pdf";
    case "docx":
      return "docx";
    case "jpg":
    case "jpeg":
    case "jpe":
    case "png":
    case "webp":
    case "gif":
      return "image";
    case "heic":
    case "heif":
      return "unsupported";
    case "txt":
    case "text":
    case "md":
    case "markdown":
    case "csv":
    case "tsv":
    case "html":
    case "htm":
      return "text";
    default:
      return undefined;
  }
}

function kindFromMime(mime: string): SniffKind | undefined {
  const type = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!type || type === "application/octet-stream") return undefined;
  if (type === "application/pdf" || type === "application/x-pdf") return "pdf";
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (type === "image/heic" || type === "image/heif") return "unsupported";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("text/")) return "text";
  return undefined;
}

export function looksLikeText(buf: Uint8Array): boolean {
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0) return false;
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

function startsWithAscii(buf: Uint8Array, prefix: string): boolean {
  if (buf.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (buf[i] !== prefix.charCodeAt(i)) return false;
  }
  return true;
}

export async function sniffFile(buf: Uint8Array, declaredName: string, declaredMime: string): Promise<SniffResult> {
  const detected = await fileTypeFromBuffer(buf);
  let kind: SniffKind;
  let mime: string;
  let reason: string | undefined;

  if (detected) {
    mime = detected.mime;
    if (detected.ext === "pdf") kind = "pdf";
    else if (detected.ext === "docx") kind = "docx";
    else if (IMAGE_EXTS.has(detected.ext)) kind = "image";
    else {
      kind = "unsupported";
      reason = UNSUPPORTED_REASONS[detected.ext] ?? GENERIC_REASON;
    }
  } else if (startsWithAscii(buf, "{\\rtf")) {
    kind = "unsupported";
    mime = "application/rtf";
    reason = UNSUPPORTED_REASONS.rtf;
  } else if (looksLikeText(buf)) {
    kind = "text";
    mime = "text/plain";
  } else {
    kind = "unsupported";
    mime = "application/octet-stream";
    reason = GENERIC_REASON;
  }

  const claims = [kindFromExtension(extensionOf(declaredName)), kindFromMime(declaredMime)];
  const mismatch = claims.some((claim) => claim !== undefined && claim !== kind);

  return reason ? { kind, mime, mismatch, reason } : { kind, mime, mismatch };
}

export function kindLabel(kind: SniffKind, mime?: string): string {
  switch (kind) {
    case "pdf":
      return "PDF";
    case "docx":
      return "Word document";
    case "image":
      return mime === "image/png" ? "PNG image" : mime === "image/gif" ? "GIF image" : mime === "image/webp" ? "WebP image" : "JPEG image";
    case "text":
      return "text file";
    default:
      return "file";
  }
}
