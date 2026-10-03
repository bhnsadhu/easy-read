import { STOPWORDS, stem, tokenize } from "./match";
import { syllableCount } from "./syllables";

export function pickKeyWords(text: string, max = 8): string[] {
  const freq = new Map<string, { word: string; n: number; syl: number }>();
  for (const raw of tokenize(text)) {
    const w = raw.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
    if (w.length < 5 || STOPWORDS.has(w.toLowerCase()) || /^\d/.test(w)) continue;
    const syl = syllableCount(w);
    if (w.length < 7 && syl < 3) continue;
    const key = stem(w.toLowerCase());
    const e = freq.get(key);
    if (e) e.n++;
    else freq.set(key, { word: w, n: 1, syl });
  }
  return [...freq.values()]
    .sort((a, b) => b.syl * b.n - a.syl * a.n || b.word.length - a.word.length)
    .slice(0, max)
    .map((e) => e.word);
}

export function findDefinitionInText(word: string, sentences: string[]): { definition: string | null; example: string | null } {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const has = new RegExp(`\\b${esc}\\b`, "i");
  const example = sentences.find((s) => has.test(s)) ?? null;
  const patterns = [
    new RegExp(`\\b${esc}\\b\\s+(?:is|are|was|were|means|refers to)\\s+(.+?)[.!?]?$`, "i"),
    new RegExp(`\\b${esc}\\b,\\s+(?:which|that)\\s+(?:is|are|means)\\s+(.+?)[,.!?]`, "i"),
    new RegExp(`\\b${esc}\\b\\s*\\(([^)]{6,120})\\)`, "i"),
  ];
  for (const s of sentences) {
    for (const re of patterns) {
      const m = s.match(re);
      if (m?.[1] && m[1].length >= 6) return { definition: m[1].trim().replace(/[.!?]$/, "").replace(/^\w/, (c) => c.toUpperCase()).slice(0, 300), example: s };
    }
  }
  return { definition: null, example };
}
