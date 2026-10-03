import { extractText as unpdfExtractText, getDocumentProxy, getResolvedPDFJS } from "unpdf";
import type { PDFDocumentProxy } from "unpdf/pdfjs";
import type { ExtractedDocument } from "@/lib/content/types";
import { IngestError } from "./errors";
import { LIMITS } from "./sniff";

// A page with fewer non-space characters than this is treated as scanned.
export const SCANNED_PAGE_MIN_CHARS = 50;
// When at least this share of pages is scanned, the whole file goes to vision.
export const SCANNED_SHARE_FOR_VISION = 0.5;

export const MATH_WARNING = "Math was kept as written. Check it before publishing.";

const MATH_CHARS = /[=+−×÷^√∑∫]/g;

export function isMathLine(line: string): boolean {
  const symbols = (line.match(MATH_CHARS) ?? []).length;
  const fracs = (line.match(/\\frac/g) ?? []).length * 3;
  return symbols + fracs >= 3;
}

function nonSpaceChars(s: string): number {
  return s.replace(/\s+/g, "").length;
}

const TERMINAL = /[.!?:;"”’)\]]$/;
const SHORT_LINE_WORDS = 3;

type TextItem = { str: string; x: number; width: number; hasEOL: boolean };

// Lines that end with a hyphen and continue with a lowercase word are one
// word broken by the layout: "photo-" + "synthesis" → "photosynthesis".
export function joinHyphenatedBreaks(lines: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let line = lines[i] ?? "";
    while (i + 1 < lines.length) {
      const next = lines[i + 1] ?? "";
      const tail = line.match(/(\p{Ll}+)-$/u);
      const head = next.match(/^(\p{Ll}+)/u);
      if (!tail || !head) break;
      line = line.slice(0, -1) + next;
      i++;
    }
    out.push(line);
    i++;
  }
  return out;
}

// Reflows the raw lines of one page into paragraphs separated by a blank line.
// Math-ish lines are kept verbatim on their own.
export function cleanPageText(raw: string): { text: string; hasMath: boolean; shortLineShare: number } {
  const rawLines = raw.replace(/\r\n?/g, "\n").split("\n");
  const lines = joinHyphenatedBreaks(
    rawLines.map((l) => (isMathLine(l) ? l.replace(/\s+$/g, "") : l.replace(/\s+/g, " ").trim())),
  );
  const maxLen = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const paragraphs: string[] = [];
  let current: string[] = [];
  let hasMath = false;
  let shortLines = 0;
  let contentLines = 0;

  const endParagraph = () => {
    if (current.length) paragraphs.push(current.join(" "));
    current = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!line) {
      endParagraph();
      continue;
    }
    contentLines++;
    if (isMathLine(line)) {
      hasMath = true;
      endParagraph();
      paragraphs.push(line);
      continue;
    }
    const words = line.split(" ").length;
    if (words <= SHORT_LINE_WORDS && !TERMINAL.test(line)) shortLines++;

    const next = lines[i + 1] ?? "";
    const nextStartsUpper = /^[\p{Lu}\p{N}•\-–]/u.test(next);
    const startsBlock = current.length === 0;
    const headingLike =
      startsBlock && words <= 8 && !TERMINAL.test(line) && !/[,\-–]$/.test(line) && (next === "" || nextStartsUpper);
    if (headingLike) {
      paragraphs.push(line);
      continue;
    }
    current.push(line);
    const endsSentence = TERMINAL.test(line);
    const shortish = line.length < maxLen * 0.75;
    if (endsSentence && (shortish || next === "") && (next === "" || nextStartsUpper)) {
      endParagraph();
    }
  }
  endParagraph();

  return {
    text: paragraphs.join("\n\n").trim(),
    hasMath,
    shortLineShare: contentLines ? shortLines / contentLines : 0,
  };
}

// Column and table detection from text positions on one page.
export function analyseLayout(items: TextItem[], pageWidth: number): { columns: boolean; table: boolean } {
  type Line = { segments: string[] };
  const lines: Line[] = [];
  let cur: { lastEnd: number | null; segments: string[] } = { lastEnd: null, segments: [] };
  const gapThreshold = pageWidth * 0.08;
  for (const item of items) {
    const str = item.str;
    if (str.trim()) {
      const startsNew = cur.lastEnd === null || item.x - cur.lastEnd > gapThreshold;
      if (startsNew) cur.segments.push(str.trim());
      else cur.segments[cur.segments.length - 1] = `${cur.segments[cur.segments.length - 1] ?? ""} ${str.trim()}`;
      cur.lastEnd = item.x + item.width;
    }
    if (item.hasEOL) {
      if (cur.segments.length) lines.push({ segments: cur.segments });
      cur = { lastEnd: null, segments: [] };
    }
  }
  if (cur.segments.length) lines.push({ segments: cur.segments });

  if (lines.length < 6) return { columns: false, table: false };
  const wordsOf = (s: string) => s.split(/\s+/).filter(Boolean).length;
  let twoCol = 0;
  let tableLike = 0;
  for (const line of lines) {
    const n = line.segments.length;
    if (n === 2 && line.segments.every((s) => wordsOf(s) >= 3)) twoCol++;
    else if (n >= 2 && line.segments.every((s) => wordsOf(s) <= 3)) tableLike++;
  }
  return {
    columns: twoCol / lines.length >= 0.5,
    table: tableLike / lines.length >= 0.5 && twoCol / lines.length < 0.5,
  };
}

function pdfTitle(info: Record<string, unknown> | undefined, firstPageText: string): string | undefined {
  const raw = typeof info?.Title === "string" ? info.Title.trim() : "";
  if (raw && raw.length <= 200 && !/\.(pdf|docx?|pptx?|txt|indd)$/i.test(raw) && !/^microsoft word/i.test(raw)) {
    return raw;
  }
  const first = firstPageText.split("\n").find((l) => l.trim());
  if (first && first.length <= 80 && !isMathLine(first)) return first.trim();
  return undefined;
}

async function pageHasImage(pdf: PDFDocumentProxy, pageNumber: number): Promise<boolean> {
  const { OPS } = await getResolvedPDFJS();
  const imageOps = new Set(
    [OPS.paintImageXObject, OPS.paintImageXObjectRepeat, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject]
      .filter((v): v is number => typeof v === "number"),
  );
  try {
    const page = await pdf.getPage(pageNumber);
    const ops = await page.getOperatorList();
    return ops.fnArray.some((fn) => imageOps.has(fn));
  } catch {
    return false;
  }
}

export async function extractPdf(buf: Uint8Array): Promise<ExtractedDocument> {
  let pdf: PDFDocumentProxy;
  try {
    // PDF.js may take ownership of the buffer; hand it a copy.
    pdf = await getDocumentProxy(new Uint8Array(buf));
  } catch (cause) {
    const name = (cause as { name?: string } | null)?.name;
    if (name === "PasswordException") throw new IngestError("password_protected", {}, { cause });
    throw new IngestError("corrupt", {}, { cause });
  }

  try {
    const pages = pdf.numPages;
    if (pages === 0) throw new IngestError("empty");
    if (pages > LIMITS.maxPdfPages) {
      throw new IngestError("too_many_pages", { pages, limit: LIMITS.maxPdfPages });
    }

    let pageTexts: string[];
    try {
      const result = await unpdfExtractText(pdf, { mergePages: false });
      pageTexts = result.text;
    } catch (cause) {
      throw new IngestError("corrupt", {}, { cause });
    }

    const scanned = pageTexts.map((t) => nonSpaceChars(t) < SCANNED_PAGE_MIN_CHARS);
    const scannedCount = scanned.filter(Boolean).length;
    const totalChars = pageTexts.reduce((n, t) => n + nonSpaceChars(t), 0);
    const needsVision = scannedCount / pages >= SCANNED_SHARE_FOR_VISION;

    if (totalChars === 0) {
      let anyImage = false;
      for (let p = 1; p <= pages && !anyImage; p++) anyImage = await pageHasImage(pdf, p);
      if (!anyImage) throw new IngestError("empty");
    }

    const warnings: string[] = [];
    const cleaned: string[] = [];
    let hasMath = false;
    const columnPages: number[] = [];
    const tablePages: number[] = [];

    for (let p = 0; p < pages; p++) {
      const raw = pageTexts[p] ?? "";
      if (scanned[p]) {
        cleaned.push(nonSpaceChars(raw) ? cleanPageText(raw).text : "");
        continue;
      }
      const result = cleanPageText(raw);
      cleaned.push(result.text);
      if (result.hasMath) hasMath = true;

      let columns = result.shortLineShare >= 0.6 && raw.split("\n").length >= 12;
      let table = false;
      try {
        const page = await pdf.getPage(p + 1);
        const content = await page.getTextContent();
        const view = page.view;
        const width = Math.abs((view[2] ?? 0) - (view[0] ?? 0)) || 612;
        const items: TextItem[] = (content.items as unknown as { str?: string; transform?: number[]; width?: number; hasEOL?: boolean }[])
          .filter((it) => typeof it.str === "string")
          .map((it) => ({ str: it.str ?? "", x: it.transform?.[4] ?? 0, width: it.width ?? 0, hasEOL: Boolean(it.hasEOL) }));
        const layout = analyseLayout(items, width);
        columns = columns || layout.columns;
        table = layout.table;
      } catch {
        // Layout analysis is best effort.
      }
      if (columns) columnPages.push(p + 1);
      else if (table) tablePages.push(p + 1);
    }

    if (scannedCount > 0 && scannedCount < pages) {
      warnings.push(
        needsVision
          ? `${scannedCount} of ${pages} pages look scanned, so we'll read the whole file as images.`
          : `${scannedCount === 1 ? "Page" : "Pages"} ${scanned
              .map((s, i) => (s ? i + 1 : null))
              .filter((n): n is number => n !== null)
              .join(", ")} ${scannedCount === 1 ? "looks" : "look"} scanned or blank. Check that nothing is missing.`,
      );
    } else if (needsVision) {
      warnings.push("This PDF looks scanned, so we'll read it as images.");
    }
    if (hasMath) warnings.push(MATH_WARNING);
    for (const p of columnPages) {
      warnings.push(`Page ${p} looks like it has two columns. Check the reading order before publishing.`);
    }
    for (const p of tablePages) {
      warnings.push(`Page ${p} looks like a table. Check the rows before publishing.`);
    }

    const text = cleaned.filter((t) => t).join("\n\n").trim();
    const doc: ExtractedDocument = { text, pages, warnings };
    if (needsVision) doc.needsVision = true;

    let info: Record<string, unknown> | undefined;
    try {
      info = (await pdf.getMetadata()).info as Record<string, unknown>;
    } catch {
      info = undefined;
    }
    const title = pdfTitle(info, cleaned[0] ?? "");
    if (title) doc.title = title;
    return doc;
  } finally {
    await (pdf as unknown as { destroy?: () => Promise<void> }).destroy?.().catch(() => undefined);
  }
}
