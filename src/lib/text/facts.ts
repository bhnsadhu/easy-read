import { normalizeForMatch, STOPWORDS, stem, wordsToDigits } from "./match";
import { ACADEMIC_WORDS } from "./simplify";

export type Fact = { kind: "number" | "date" | "percent" | "money" | "name" | "term"; value: string; normalized: string };

const NUMBER = /(?<![\w$€£])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(%|\s?percent)?(?![\w])/g;
const MONEY = /[$€£]\s?\d[\d,]*(?:\.\d+)?/g;
const YEAR = /\b(1[0-9]{3}|20[0-9]{2})s?\b/g;
const NAME = /\b(?:[A-Z][a-z]+(?:\s(?:van|de|der|von|da|di|la|le)\s)?){1}(?:\s[A-Z][a-z]+)+\b/g;
const TERM = /\b[A-Za-z][a-z]{8,}\b|\b(?:[A-Z][a-z]*\d+[A-Za-z0-9]*|[A-Z]{2,}\d*)\b/g;
const MONTHS = /^(January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/;

export function extractFacts(text: string): Fact[] {
  const out = new Map<string, Fact>();
  const add = (f: Fact) => {
    if (!out.has(f.normalized)) out.set(f.normalized, f);
  };
  for (const m of text.matchAll(MONEY)) add({ kind: "money", value: m[0], normalized: m[0].replace(/[,\s]/g, "") });
  for (const m of text.matchAll(YEAR)) add({ kind: "date", value: m[0], normalized: m[1]! });
  for (const m of text.matchAll(NUMBER)) {
    const num = m[1]!.replace(/,/g, "");
    if (/^(1[0-9]{3}|20[0-9]{2})$/.test(num)) continue;
    add(m[2] ? { kind: "percent", value: m[0].trim(), normalized: `${num}%` } : { kind: "number", value: m[1]!, normalized: num });
  }
  for (const m of text.matchAll(NAME)) {
    const words = m[0].split(/\s+/);
    if (words.some((w) => MONTHS.test(w)) || words.every((w) => STOPWORDS.has(w.toLowerCase()))) continue;
    add({ kind: "name", value: m[0], normalized: m[0].toLowerCase() });
  }
  for (const m of text.matchAll(TERM)) {
    const w = m[0];
    const lower = w.toLowerCase();
    if (STOPWORDS.has(lower) || ACADEMIC_WORDS.has(lower) || (/^[A-Z][a-z]+$/.test(w) && w.length < 12)) continue;
    // Plain long words with common suffixes are vocabulary, not facts; keep scientific-looking ones.
    if (/^[a-z]+(ly|ness|ment|tion|sion|ally|ful|less|able|ible|ated|ating|ized|izing)$/.test(lower) && !/(ation|ization)$/.test(lower)) continue;
    add({ kind: "term", value: w, normalized: stem(w.toLowerCase()) });
  }
  return [...out.values()];
}

export function verifyFacts(sourceText: string, rewrittenText: string): { missing: Fact[]; present: Fact[]; softened: Fact[] } {
  const facts = extractFacts(sourceText);
  const target = normalizeForMatch(wordsToDigits(rewrittenText)).replace(/,(?=\d{3})/g, "").replace(/\bpercent\b/g, "%");
  const stems = new Set(target.split(/[^a-z0-9%$€£.]+/).map((w) => stem(w)));
  const missing: Fact[] = [];
  const present: Fact[] = [];
  const softened: Fact[] = [];
  for (const f of facts) {
    const n = f.normalized.toLowerCase();
    let ok = false;
    if (f.kind === "name") {
      const last = n.split(" ").at(-1)!;
      ok = target.includes(n) || stems.has(stem(last));
    } else if (f.kind === "term") ok = stems.has(n) || target.includes(n);
    else if (f.kind === "percent") ok = target.includes(n) || target.includes(n.replace("%", " %"));
    else ok = target.includes(n);
    (ok ? present : missing).push(f);
  }
  return { missing, present, softened };
}

export function factGuardSummary(missing: Fact[]): string {
  if (!missing.length) return "Every fact from the original is in the rewrite.";
  const list = missing.slice(0, 5).map((f) => f.value).join(", ");
  const n = missing.length;
  return `${n} ${n === 1 ? "fact was" : "facts were"} dropped: ${list}${n > 5 ? ", and more" : ""}.`;
}
