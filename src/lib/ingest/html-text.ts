import { parseHTML } from "linkedom";

// A small HTML to plain-text pass shared by the DOCX and URL importers.
// Headings become "## " / "### " lines, list items "- " / "1. ", table rows
// tab-separated cells, and paragraphs are separated by a blank line.
// Output is plain text, never HTML.

const SKIP = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "SVG",
  "HEAD",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "CANVAS",
  "VIDEO",
  "AUDIO",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "BUTTON",
  "IMG",
  "PICTURE",
  "MAP",
]);

const BLOCK = new Set([
  "P",
  "DIV",
  "SECTION",
  "ARTICLE",
  "MAIN",
  "ASIDE",
  "HEADER",
  "FOOTER",
  "NAV",
  "BLOCKQUOTE",
  "FIGURE",
  "FIGCAPTION",
  "ADDRESS",
  "DD",
  "DT",
  "DL",
  "DETAILS",
  "SUMMARY",
  "FORM",
  "FIELDSET",
  "HR",
  "BODY",
  "HTML",
  "CENTER",
]);

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

type Ctx = { blocks: string[]; buf: string };

function collapse(s: string): string {
  return s.replace(/[ \t\r\n\f\v ]+/g, " ");
}

function flush(ctx: Ctx): void {
  const t = ctx.buf
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
  if (t) ctx.blocks.push(t);
  ctx.buf = "";
}

function inlineText(node: Node): string {
  const ctx: Ctx = { blocks: [], buf: "" };
  walkChildren(node, ctx);
  flush(ctx);
  return collapse(ctx.blocks.join(" ")).trim();
}

function blocksOf(node: Node): string[] {
  const ctx: Ctx = { blocks: [], buf: "" };
  walkChildren(node, ctx);
  flush(ctx);
  return ctx.blocks;
}

function walkChildren(node: Node, ctx: Ctx): void {
  for (const child of Array.from(node.childNodes)) walk(child, ctx);
}

function listLines(el: Element, ordered: boolean): string[] {
  const lines: string[] = [];
  let n = 0;
  for (const child of Array.from(el.children)) {
    if (child.tagName !== "LI") {
      // Stray content inside a list (rare); keep it.
      for (const b of blocksOf(child)) lines.push(b);
      continue;
    }
    n++;
    const prefix = ordered ? `${n}. ` : "- ";
    const inner = blocksOf(child).join("\n");
    const [first = "", ...rest] = inner.split("\n");
    lines.push(prefix + first);
    for (const r of rest) lines.push("  " + r);
  }
  return lines;
}

function tableRows(el: Element, rows: string[]): void {
  for (const child of Array.from(el.children)) {
    const tag = child.tagName;
    if (tag === "TR") {
      const cells: string[] = [];
      for (const cell of Array.from(child.children)) {
        if (cell.tagName === "TD" || cell.tagName === "TH") cells.push(inlineText(cell));
      }
      if (cells.some((c) => c)) rows.push(cells.join("\t"));
    } else if (tag === "THEAD" || tag === "TBODY" || tag === "TFOOT") {
      tableRows(child, rows);
    } else if (tag === "CAPTION") {
      const cap = inlineText(child);
      if (cap) rows.push(cap);
    }
  }
}

function walk(node: Node, ctx: Ctx): void {
  if (node.nodeType === TEXT_NODE) {
    ctx.buf += collapse(node.textContent ?? "");
    return;
  }
  if (node.nodeType !== ELEMENT_NODE) return;
  const el = node as Element;
  const tag = el.tagName;
  if (SKIP.has(tag)) return;

  switch (tag) {
    case "H1":
    case "H2": {
      flush(ctx);
      const t = inlineText(el);
      if (t) ctx.blocks.push("## " + t);
      return;
    }
    case "H3":
    case "H4":
    case "H5":
    case "H6": {
      flush(ctx);
      const t = inlineText(el);
      if (t) ctx.blocks.push("### " + t);
      return;
    }
    case "UL":
    case "OL": {
      flush(ctx);
      const lines = listLines(el, tag === "OL");
      if (lines.length) ctx.blocks.push(lines.join("\n"));
      return;
    }
    case "TABLE": {
      flush(ctx);
      const rows: string[] = [];
      tableRows(el, rows);
      if (rows.length) ctx.blocks.push(rows.join("\n"));
      return;
    }
    case "PRE": {
      flush(ctx);
      const t = (el.textContent ?? "").replace(/\r\n?/g, "\n").replace(/^\n+|\s+$/g, "");
      if (t) ctx.blocks.push(t);
      return;
    }
    case "BR":
      ctx.buf += "\n";
      return;
    case "LI": {
      // A list item outside a list: treat as a bullet.
      flush(ctx);
      const t = blocksOf(el).join("\n");
      if (t) ctx.blocks.push("- " + t);
      return;
    }
    default:
      break;
  }

  if (BLOCK.has(tag)) {
    flush(ctx);
    walkChildren(el, ctx);
    flush(ctx);
    return;
  }
  // Inline element: keep flowing into the current block.
  walkChildren(el, ctx);
}

export function elementToText(root: Node): string {
  return blocksOf(root).join("\n\n").trim();
}

export function htmlToText(html: string): string {
  const { document } = parseHTML(html);
  const body = document.body ?? document.documentElement;
  if (!body) return "";
  return elementToText(body);
}

// First "## " heading in the text, used as a title fallback.
export function firstHeading(text: string): string | undefined {
  const line = text.split("\n").find((l) => l.startsWith("## ") || l.startsWith("### "));
  return line ? line.replace(/^#+ /, "").trim() : undefined;
}
