import { SECTION_TARGET_WORDS, SHORT_MATERIAL_WORDS, type Block, type SectionDraft } from "@/lib/content/types";
import { countWords, splitSentences } from "./sentences";

const MATH = /[=+\u2212×÷^√∑∫]|\\frac/g;
const LIST = /^\s*(?:[-*•]|\d{1,2}[.)]|[a-z][.)])\s+/;
const ORDERED = /^\s*(?:\d{1,2}[.)]|[a-z][.)])\s+/;

function isAllCaps(s: string): boolean {
  const letters = s.replace(/[^A-Za-z]/g, "");
  return letters.length >= 4 && letters === letters.toUpperCase();
}

function sentenceCase(s: string): string {
  if (!isAllCaps(s)) return s;
  const lower = s.toLowerCase();
  return lower.replace(/(^\s*\w|[.!?]\s+\w)/g, (m) => m.toUpperCase()).replace(/\b([a-z]{1,4})\b/g, (w) => (/^(co2|h2o|dna|rna|usa|uk|us|nasa|fbi|ceo)$/.test(w) ? w.toUpperCase() : w));
}

function looksLikeHeading(line: string, next: string | undefined): boolean {
  if (line.length > 80 || /[.!?,;:]$/.test(line)) return false;
  if (/^(chapter|part|unit|lesson|section)\b/i.test(line) || /^\d+(\.\d+)*\s+\S/.test(line)) return true;
  if (!next) return false;
  const words = line.split(/\s+/);
  if (words.length > 10) return false;
  const caps = words.filter((w) => /^[A-Z]/.test(w)).length;
  return isAllCaps(line) || caps / words.length >= 0.7;
}

export function structureText(text: string): Block[] {
  const blocks: Block[] = [];
  const chunks = text.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);
  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const first = lines[0]!;
    const md = first.match(/^(#{1,3})\s+(.+)$/);
    if (md && lines.length === 1) {
      blocks.push({ type: "heading", level: md[1]!.length >= 3 ? 3 : 2, text: sentenceCase(md[2]!.trim()) });
      continue;
    }
    if (lines.every((l) => LIST.test(l))) {
      blocks.push({ type: "list", ordered: ORDERED.test(first), items: lines.map((l) => splitSentences(sentenceCase(l.replace(LIST, "")))).filter((i) => i.length) });
      continue;
    }
    if (lines.length >= 2 && lines.every((l) => l.includes("\t") || l.includes(" | "))) {
      const rows = lines.map((l) => l.split(/\t| \| /).map((c) => c.trim()));
      blocks.push({ type: "table", header: rows[0], rows: rows.slice(1).length ? rows.slice(1) : rows });
      continue;
    }
    const text1 = lines.join(" ");
    if ((text1.match(MATH) ?? []).length >= 3 && text1.length < 300) {
      blocks.push({ type: "math", text: text1 });
      continue;
    }
    if (lines.length >= 2 && looksLikeHeading(first, lines[1])) {
      blocks.push({ type: "heading", level: 2, text: sentenceCase(first.replace(/^#+\s*/, "")) });
      const rest = splitSentences(sentenceCase(lines.slice(1).join(" ")));
      if (rest.length) blocks.push({ type: "paragraph", sentences: rest });
      continue;
    }
    if (lines.length === 1 && looksLikeHeading(first, chunks[chunks.indexOf(chunk) + 1])) {
      blocks.push({ type: "heading", level: 2, text: sentenceCase(first.replace(/^#+\s*/, "")) });
      continue;
    }
    const sentences = splitSentences(sentenceCase(text1));
    if (sentences.length) blocks.push({ type: "paragraph", sentences });
  }
  return blocks;
}

function blockWords(b: Block): number {
  switch (b.type) {
    case "heading":
      return countWords(b.text);
    case "paragraph":
      return b.sentences.reduce((a, s) => a + countWords(s), 0);
    case "list":
      return b.items.flat().reduce((a, s) => a + countWords(s), 0);
    case "math":
      return 5;
    case "table":
      return b.rows.flat().reduce((a, s) => a + countWords(s), 0);
    case "image":
      return 3;
  }
}

function titleFor(blocks: Block[]): string {
  const h = blocks.find((b) => b.type === "heading");
  if (h && h.type === "heading") return h.text.slice(0, 120);
  for (const b of blocks) {
    const s = b.type === "paragraph" ? b.sentences[0] : b.type === "list" ? b.items[0]?.[0] : undefined;
    if (s) return s.replace(/[.!?]$/, "").split(/\s+/).slice(0, 7).join(" ");
  }
  return "Reading";
}

export function chunkIntoSections(blocks: Block[]): SectionDraft[] {
  const total = blocks.reduce((a, b) => a + blockWords(b), 0);
  if (!blocks.length) return [];
  if (total < SHORT_MATERIAL_WORDS) return [{ position: 0, title: titleFor(blocks), original: { blocks } }];

  // Oversized paragraphs are split at sentence boundaries first.
  const units: Block[] = [];
  for (const b of blocks) {
    if (b.type === "paragraph" && blockWords(b) > 260) {
      let cur: string[] = [];
      let n = 0;
      for (const s of b.sentences) {
        cur.push(s);
        n += countWords(s);
        if (n >= SECTION_TARGET_WORDS.max) {
          units.push({ type: "paragraph", sentences: cur });
          cur = [];
          n = 0;
        }
      }
      if (cur.length) units.push({ type: "paragraph", sentences: cur });
    } else units.push(b);
  }

  const sections: SectionDraft[] = [];
  let cur: Block[] = [];
  let words = 0;
  const flush = () => {
    if (cur.length) sections.push({ position: sections.length, title: titleFor(cur), original: { blocks: cur } });
    cur = [];
    words = 0;
  };
  for (const b of units) {
    const w = blockWords(b);
    if (b.type === "heading" && words >= 60) flush();
    else if (words > 0 && words + w > SECTION_TARGET_WORDS.max && words >= SECTION_TARGET_WORDS.min) flush();
    cur.push(b);
    words += w;
  }
  flush();
  // A tiny trailing section joins the previous one.
  const last = sections.at(-1);
  const prev = sections.at(-2);
  if (last && prev && last.original.blocks.reduce((a, b) => a + blockWords(b), 0) < 40) {
    prev.original.blocks.push(...last.original.blocks);
    sections.pop();
  }
  return sections;
}
