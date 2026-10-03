import { sectionContent, type Block, type SectionContent } from "@/lib/content/types";

const TAG = /<[^>]*>/g;
const SCRIPT = /<(script|style)[\s\S]*?<\/\1>/gi;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;
const BAD_SCHEME = /\b(javascript|data|vbscript):/gi;

export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.normalize("NFC").replace(SCRIPT, "").replace(TAG, "").replace(CONTROL, "").replace(ZERO_WIDTH, "").replace(BAD_SCHEME, "$1 ").replace(/[ \t]+/g, " ").trim();
}

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n).trim() : s);

function cleanSentences(list: unknown, max = 60): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((s) => cut(sanitizeText(s), 1000)).filter(Boolean).slice(0, max);
}

// Belt-and-braces: content is never rendered as HTML, but every string is
// still cleaned and the result must satisfy the schema. Never throws.
export function sanitizeContent(content: unknown): SectionContent {
  const blocks: Block[] = [];
  const raw = (content as { blocks?: unknown })?.blocks;
  if (Array.isArray(raw)) {
    for (const b of raw as Record<string, unknown>[]) {
      if (!b || typeof b !== "object") continue;
      switch (b.type) {
        case "heading": {
          const text = cut(sanitizeText(b.text), 300);
          if (text) blocks.push({ type: "heading", level: b.level === 3 ? 3 : 2, text });
          break;
        }
        case "paragraph": {
          const sentences = cleanSentences(b.sentences);
          if (sentences.length) blocks.push({ type: "paragraph", sentences });
          break;
        }
        case "list": {
          const items = Array.isArray(b.items) ? b.items.map((i) => cleanSentences(i, 20)).filter((i) => i.length).slice(0, 50) : [];
          if (items.length) blocks.push({ type: "list", ordered: Boolean(b.ordered), items });
          break;
        }
        case "math": {
          const text = cut(sanitizeText(b.text), 2000);
          if (text) blocks.push({ type: "math", text });
          break;
        }
        case "table": {
          const rows = Array.isArray(b.rows) ? b.rows.map((r) => (Array.isArray(r) ? r.map((c) => cut(sanitizeText(c), 500)).slice(0, 12) : [])).filter((r) => r.length).slice(0, 100) : [];
          const header = Array.isArray(b.header) ? b.header.map((c) => cut(sanitizeText(c), 200)).slice(0, 12) : undefined;
          if (rows.length) blocks.push({ type: "table", ...(header?.length ? { header } : {}), rows });
          break;
        }
        case "image": {
          blocks.push({ type: "image", alt: cut(sanitizeText(b.alt), 500), ai: Boolean(b.ai), ...(typeof b.assetId === "string" ? { assetId: b.assetId } : {}) });
          break;
        }
      }
      if (blocks.length >= 80) break;
    }
  }
  const parsed = sectionContent.safeParse({ blocks });
  if (parsed.success) return parsed.data;
  return { blocks: [{ type: "paragraph", sentences: ["This section could not be read."] }] };
}
