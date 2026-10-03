import { createHash } from "node:crypto";
import type { ExtractedDocument } from "@/lib/content/types";
import { extractDocx } from "./docx";
import { IngestError } from "./errors";
import { htmlToText } from "./html-text";
import { extractImage, type PreparedImage } from "./image";
import { extractPdf } from "./pdf";
import { detectPii, type PiiReport } from "./pii";
import { kindLabel, LIMITS, sniffFile, type SniffResult } from "./sniff";
import { detectLanguage, extractText, normaliseText } from "./text";
import { fetchUrlToText, type UrlDeps } from "./url";

export type IngestInput =
  | { kind: "file"; buffer: Uint8Array; name: string; mime: string }
  | { kind: "paste"; text: string }
  | { kind: "url"; url: string };

export type IngestSource = "pdf" | "docx" | "image" | "text" | "paste" | "url";

export type IngestResult = {
  doc: ExtractedDocument;
  source: IngestSource;
  // sha256 of the normalised text, or of the bytes when the file goes to vision.
  contentHash: string;
  pii: PiiReport;
  sniff?: SniffResult;
  // Present for images: the rotated, downscaled JPEG to store and send to vision.
  prepared?: PreparedImage;
};

export type IngestDeps = { url?: UrlDeps };

function sha256(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

// Whitespace-insensitive, Unicode-normalised form used only for hashing.
export function hashableText(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

const HTML_FILE = /^\s*(?:<!doctype html|<html[\s>])/i;

function decodeUtf8(buf: Uint8Array): string {
  return new TextDecoder("utf-8").decode(buf).replace(/^﻿/, "");
}

function finish(
  doc: ExtractedDocument,
  source: IngestSource,
  extras: { bytes?: Uint8Array; sniff?: SniffResult; prepared?: PreparedImage },
): IngestResult {
  if (!doc.language && doc.text.trim()) doc.language = detectLanguage(doc.text);
  const hashInput = doc.needsVision && extras.bytes ? extras.bytes : hashableText(doc.text);
  const result: IngestResult = {
    doc,
    source,
    contentHash: sha256(hashInput),
    pii: detectPii(doc.text),
  };
  if (extras.sniff) result.sniff = extras.sniff;
  if (extras.prepared) result.prepared = extras.prepared;
  return result;
}

async function ingestFile(input: Extract<IngestInput, { kind: "file" }>): Promise<IngestResult> {
  const { buffer, name, mime } = input;
  if (buffer.byteLength > LIMITS.maxUploadBytes) {
    throw new IngestError("too_large", {
      sizeMb: Math.round((buffer.byteLength / (1024 * 1024)) * 10) / 10,
      limit: Math.round(LIMITS.maxUploadBytes / (1024 * 1024)),
    });
  }
  if (buffer.byteLength === 0) throw new IngestError("empty");

  const sniff = await sniffFile(buffer, name, mime);
  if (sniff.kind === "unsupported") {
    if (sniff.mime === "image/heic" || sniff.mime === "image/heif") throw new IngestError("heic");
    throw new IngestError("unsupported_type", { reason: sniff.reason });
  }

  const warnings: string[] = [];
  if (sniff.mismatch) {
    const label = kindLabel(sniff.kind, sniff.mime);
    warnings.push(`"${name}" is actually a ${label}, so we read it as one.`);
  }

  switch (sniff.kind) {
    case "pdf": {
      const doc = await extractPdf(buffer);
      doc.warnings = [...warnings, ...doc.warnings];
      return finish(doc, "pdf", { bytes: buffer, sniff });
    }
    case "docx": {
      const doc = await extractDocx(buffer);
      doc.warnings = [...warnings, ...doc.warnings];
      return finish(doc, "docx", { sniff });
    }
    case "image": {
      const { doc, prepared } = await extractImage(buffer);
      doc.warnings = [...warnings, ...doc.warnings];
      return finish(doc, "image", { bytes: buffer, sniff, prepared });
    }
    case "text": {
      const raw = decodeUtf8(buffer);
      if (!raw.trim()) throw new IngestError("empty");
      const doc = HTML_FILE.test(raw) ? extractText(htmlToText(raw)) : extractText(raw);
      doc.warnings = [...warnings, ...doc.warnings];
      return finish(doc, "text", { sniff });
    }
  }
}

export async function ingest(input: IngestInput, deps: IngestDeps = {}): Promise<IngestResult> {
  switch (input.kind) {
    case "file":
      return ingestFile(input);
    case "paste": {
      const doc = extractText(input.text);
      return finish(doc, "paste", {});
    }
    case "url": {
      const doc = await fetchUrlToText(input.url, deps.url);
      // Pages pass through the same normalisation as pasted text.
      doc.text = normaliseText(doc.text);
      return finish(doc, "url", {});
    }
  }
}

export { IngestError, isIngestError, userMessageFor } from "./errors";
export type { IngestErrorCode, IngestErrorDetails } from "./errors";
export { LIMITS, sniffFile } from "./sniff";
export type { SniffKind, SniffResult } from "./sniff";
export { extractPdf } from "./pdf";
export { extractDocx } from "./docx";
export { extractImage, prepareImage } from "./image";
export type { PreparedImage } from "./image";
export { extractText, detectLanguage, isRtl, normaliseText, countWords } from "./text";
export { fetchUrlToText } from "./url";
export type { UrlDeps, LookupFn, FetchFn } from "./url";
export { assertPublicHttpUrl, isPrivateAddress } from "./ssrf";
export { detectPii, redactPii } from "./pii";
export type { PiiFinding, PiiKind, PiiReport } from "./pii";
