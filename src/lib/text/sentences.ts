import { sentences as sbdSentences } from "sbd";

// Sentence segmentation. `sbd` beat Intl.Segmenter on "Dr.", "Mr." and "p.m."
// in our tests (research-tech §6); a post-merge pass repairs the few splits it
// still gets wrong and guarantees we never emit an empty or letterless chunk.

const SBD_OPTIONS = { newline_boundaries: true, sanitize: false, allowed_tags: false as const };

// Abbreviations that essentially never end a sentence: always glue the next chunk on.
const ALWAYS_JOIN = /(?:^|[\s(["'“‘])(?:Dr|Mr|Mrs|Ms|Prof|prof|Dept|dept|Fig|fig|vs|e\.g|i\.e)\.$/;
// Abbreviations that may end a sentence: glue only when the next chunk starts lowercase or with a digit.
const MAYBE_JOIN = /(?:^|[\s(["'“‘])(?:St|Jr|Sr|U\.S|U\.K|a\.m|p\.m|etc|No|approx|p|pp|vol|ch|sec)\.$/;
const ENDS_WITH_ELLIPSIS = /(?:\.\s?){2,}\.?$|…$/;
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const STARTS_LOWER_OR_DIGIT = /^[\p{Ll}\p{N}]/u;
const STARTS_LOWER = /^\p{Ll}/u;
const LEADING_CLOSERS = /^([”"'’)\]]+)(\s+|$)/;

function join(prev: string, next: string): string {
  if (/^[”"'’)\],.;:!?…]/.test(next)) return `${prev}${next}`;
  return `${prev} ${next}`;
}

/**
 * Split prose into trimmed, non-empty sentences. Newlines are boundaries, so
 * callers should join soft-wrapped lines first. Abbreviations ("Dr.", "p.m."),
 * decimals ("3.14"), ellipses and quotes stay attached to their sentence.
 */
export function splitSentences(text: string): string[] {
  if (typeof text !== "string") return [];
  let source = text.replace(/\r\n?/g, "\n");
  if (!source.trim()) return [];
  // Spanish/inverted punctuation: a new sentence begins at "¿" or "¡" after a terminator.
  source = source.replace(/([.!?]["”’)]*)\s+([¿¡])/g, "$1\n$2");

  let raw: string[];
  try {
    raw = sbdSentences(source, SBD_OPTIONS);
  } catch {
    raw = source.split(/\n+/);
  }

  const out: string[] = [];
  let pending = "";
  for (const chunk of raw) {
    let s = chunk.replace(/\s+/g, " ").trim();
    if (!s) continue;
    if (pending) {
      s = `${pending} ${s}`;
      pending = "";
    }
    const prevIndex = out.length - 1;
    const prev = out[prevIndex];
    if (prev === undefined) {
      if (!HAS_LETTER_OR_DIGIT.test(s)) {
        pending = s;
        continue;
      }
      out.push(s);
      continue;
    }
    // A fragment with no letters or digits (lone quote, emoji, pieces of ". . .") belongs to the previous sentence.
    if (!HAS_LETTER_OR_DIGIT.test(s)) {
      out[prevIndex] = join(prev, s);
      continue;
    }
    // Closing punctuation that leaked to the start of the next chunk.
    const closers = LEADING_CLOSERS.exec(s);
    if (closers?.[1] !== undefined) {
      out[prevIndex] = `${prev}${closers[1]}`;
      s = s.slice(closers[0].length).trim();
      if (!s) continue;
    }
    const current = out[prevIndex] ?? prev;
    if (ALWAYS_JOIN.test(current) || (MAYBE_JOIN.test(current) && STARTS_LOWER_OR_DIGIT.test(s))) {
      out[prevIndex] = join(current, s);
      continue;
    }
    if (ENDS_WITH_ELLIPSIS.test(current) && STARTS_LOWER.test(s)) {
      out[prevIndex] = join(current, s);
      continue;
    }
    out.push(s);
  }
  if (pending) {
    const last = out.length - 1;
    const prev = out[last];
    if (prev === undefined) out.push(pending);
    else out[last] = join(prev, pending);
  }
  return out.filter((s) => s.length > 0);
}

const WORD = /[\p{L}\p{N}]+(?:['’.\-][\p{L}\p{N}]+)*/gu;

/** Count words: runs of letters/digits, with inner apostrophes, periods and hyphens ("don't", "3.5", "co-op" are one word each). */
export function countWords(text: string): number {
  if (typeof text !== "string" || !text) return 0;
  return (text.match(WORD) ?? []).length;
}
