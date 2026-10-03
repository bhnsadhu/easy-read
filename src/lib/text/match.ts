// Shared, deterministic text-matching helpers used by Fact Guard, quick-check
// validation and the word preview. Everything here is pure and synchronous.

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const ORDINALS: Record<string, string> = {
  first: "1st", second: "2nd", third: "3rd", fourth: "4th", fifth: "5th", sixth: "6th", seventh: "7th",
  eighth: "8th", ninth: "9th", tenth: "10th", eleventh: "11th", twelfth: "12th", thirteenth: "13th",
  fourteenth: "14th", fifteenth: "15th", sixteenth: "16th", seventeenth: "17th", eighteenth: "18th",
  nineteenth: "19th", twentieth: "20th", thirtieth: "30th", fortieth: "40th", fiftieth: "50th",
  sixtieth: "60th", seventieth: "70th", eightieth: "80th", ninetieth: "90th", hundredth: "100th",
};

const TENS_RE = Object.keys(TENS).join("|");
const ONES_RE = Object.keys(ONES).join("|");
const ORD_ONES_RE = "first|second|third|fourth|fifth|sixth|seventh|eighth|ninth";

function ordinalSuffix(n: number): string {
  const r = n % 100;
  if (r >= 11 && r <= 13) return "th";
  const last = n % 10;
  return last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th";
}

/** Replace spelled-out numbers (0–100) and ordinals with digits: "twenty-one" → "21", "nineteenth" → "19th". */
export function wordsToDigits(text: string): string {
  let t = text;
  // "twenty-first" / "twenty first"
  t = t.replace(new RegExp(`\\b(${TENS_RE})[-\\s](${ORD_ONES_RE})\\b`, "gi"), (_m, tens: string, ord: string) => {
    const n = (TENS[tens.toLowerCase()] ?? 0) + Number((ORDINALS[ord.toLowerCase()] ?? "0").replace(/\D/g, ""));
    return `${n}${ordinalSuffix(n)}`;
  });
  // "twenty-one" / "twenty one"
  t = t.replace(new RegExp(`\\b(${TENS_RE})[-\\s](${ONES_RE})\\b`, "gi"), (_m, tens: string, ones: string) => {
    return String((TENS[tens.toLowerCase()] ?? 0) + (ONES[ones.toLowerCase()] ?? 0));
  });
  t = t.replace(/\b(?:one|a)\s+hundred\b/gi, "100");
  t = t.replace(new RegExp(`\\b(${Object.keys(ORDINALS).join("|")})\\b`, "gi"), (m) => ORDINALS[m.toLowerCase()] ?? m);
  t = t.replace(new RegExp(`\\b(${TENS_RE}|${ONES_RE})\\b`, "gi"), (m) => {
    const key = m.toLowerCase();
    const n = TENS[key] ?? ONES[key];
    return n === undefined ? m : String(n);
  });
  return t;
}

const SUBSCRIPT_DIGITS: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
};

/**
 * Lowercase, NFC-normalised form of a text suitable for substring matching:
 * straight quotes, ASCII dashes, "2,400" → "2400", "21 percent" → "21%",
 * "3.50 dollars" → "$3.50", number words → digits, possessives stripped.
 */
export function normalizeForMatch(text: string): string {
  let t = String(text ?? "");
  try {
    t = t.normalize("NFC");
  } catch {
    // Keep the raw text if normalisation is unavailable.
  }
  t = t.toLowerCase();
  t = t.replace(/[‐-―−]/g, "-");
  t = t.replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"');
  t = t.replace(/[₀-₉]/g, (d) => SUBSCRIPT_DIGITS[d] ?? d);
  t = t.replace(/(\p{L})'s\b/gu, "$1");
  // 1,000,000 → 1000000 (repeat for every group)
  for (let i = 0; i < 4; i++) t = t.replace(/(\d),(?=\d{3}\b)/g, "$1");
  t = wordsToDigits(t);
  t = t.replace(/(\d)\s*(?:-\s*)?(?:%|percent|per cent)\b/g, "$1%");
  t = t.replace(/(\d)\s*%/g, "$1%");
  t = t.replace(/(\d[\d.]*)\s+(?:us\s+)?dollars?\b/g, "$$$1");
  t = t.replace(/(\d[\d.]*)\s+euros?\b/g, "€$1");
  t = t.replace(/(\d[\d.]*)\s+pounds?\s+sterling\b/g, "£$1");
  t = t.replace(/([$€£])\s+(\d)/g, "$1$2");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/** Lowercased word tokens (letters/digits, with inner apostrophes and hyphens), possessives removed. */
export function tokenize(text: string): string[] {
  const t = normalizeForMatch(text);
  return (t.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).map((w) => w.replace(/'s$/, ""));
}

/** Reduce simple English plurals to a singular form (consistency matters more than correctness). */
export function singularize(word: string): string {
  const w = word.toLowerCase();
  if (w.length <= 3) return w;
  if (/(?:ss|us|is|ous)$/.test(w)) return w;
  if (/ies$/.test(w) && w.length > 4) return `${w.slice(0, -3)}y`;
  if (/(?:ches|shes|xes|sses|zes)$/.test(w)) return w.slice(0, -2);
  if (/oes$/.test(w) && w.length > 4) return w.slice(0, -2);
  if (/s$/.test(w)) return w.slice(0, -1);
  return w;
}

const STEM_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/ingly$/, ""],
  [/edly$/, ""],
  [/ations?$/, "ate"],
  [/ing$/, ""],
  [/ed$/, ""],
  [/ly$/, ""],
  [/ness$/, ""],
  [/ment$/, ""],
  [/ful$/, ""],
];

/** A light, deterministic stemmer: plural, -ing, -ed, -ly, -ness, -ment, trailing silent e. */
export function stem(word: string): string {
  let w = word.toLowerCase().replace(/['’]s$/, "").replace(/['’]/g, "");
  if (w.length <= 3) return w;
  w = singularize(w);
  for (const [re, rep] of STEM_RULES) {
    if (re.test(w)) {
      const next = w.replace(re, rep);
      if (next.length >= 4) {
        w = next;
        break;
      }
    }
  }
  if (w.length >= 5 && /([bdfglmnprt])\1$/.test(w)) w = w.slice(0, -1);
  if (w.length >= 4 && /[^aeiou]e$/.test(w)) w = w.slice(0, -1);
  return w;
}

/** Function words and other words that carry no checkable content. */
export const STOPWORDS: ReadonlySet<string> = new Set([
  "a", "an", "the", "and", "or", "but", "nor", "so", "yet", "for", "of", "to", "in", "on", "at", "by", "with",
  "from", "as", "into", "onto", "upon", "over", "under", "about", "after", "before", "during", "while", "until",
  "since", "between", "among", "through", "across", "around", "near", "like", "unlike", "than", "then", "there",
  "here", "where", "when", "why", "how", "what", "which", "who", "whom", "whose", "this", "that", "these", "those",
  "it", "its", "he", "she", "they", "them", "their", "theirs", "we", "us", "our", "ours", "you", "your", "yours",
  "i", "me", "my", "mine", "his", "her", "hers", "him", "is", "are", "was", "were", "be", "been", "being", "am",
  "do", "does", "did", "done", "doing", "have", "has", "had", "having", "will", "would", "shall", "should", "can",
  "could", "may", "might", "must", "not", "no", "yes", "if", "because", "although", "though", "unless", "whether",
  "also", "too", "very", "just", "only", "even", "still", "already", "again", "both", "each", "every", "all",
  "any", "some", "many", "much", "more", "most", "less", "least", "few", "fewer", "several", "such", "own",
  "same", "other", "another", "others", "either", "neither", "none", "one", "ones", "once", "twice", "first",
  "second", "next", "last", "later", "now", "today", "tomorrow", "yesterday", "soon", "often", "always",
  "never", "sometimes", "usually", "however", "therefore", "thus", "hence", "instead", "rather", "quite",
  "almost", "enough", "really", "well", "much", "up", "down", "out", "off", "away", "back", "forward", "above",
  "below", "within", "without", "toward", "towards", "against", "along", "per", "via", "versus",
]);

/** Words that frame a quiz question or option but say nothing about the passage. */
export const QUIZ_STOPWORDS: ReadonlySet<string> = new Set([
  ...STOPWORDS,
  "according", "passage", "text", "section", "reading", "story", "article", "paragraph", "sentence", "author",
  "writer", "following", "best", "describes", "describe", "mainly", "main", "idea", "statement", "statements",
  "true", "false", "correct", "incorrect", "likely", "probably", "mean", "means", "meaning", "word", "phrase",
  "explain", "explains", "example", "examples", "reason", "reasons", "purpose", "detail", "details", "point",
  "point", "part", "kind", "type", "sort", "thing", "things", "something", "anything", "everything", "nothing",
  "people", "person", "someone", "everyone", "anyone", "way", "ways", "happen", "happens", "happened",
  "called", "name", "named", "number", "amount", "important", "different", "same", "lot", "lots", "mostly",
  "none", "above", "answers", "answer", "option", "options", "choose", "pick", "select", "whichever", "does",
  "did", "doesn", "didn", "wasn", "weren", "isn", "aren", "can", "cannot", "could", "would", "should", "might",
]);
