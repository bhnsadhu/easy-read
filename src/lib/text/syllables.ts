import createHyphenator from "hyphen/hyphen";
import enUsPatterns from "hyphen/patterns/en-us";
import { syllable } from "syllable";

// Visual syllable chunks for the word preview. `hyphen` (Liang patterns) gives
// typographic hyphenation points, which differ from spoken syllables for some
// common words, so an overrides map wins, and `syllable` counts are used as a
// sanity check to refine under-split words (research-tech §6, dyslexia §1.9).

const SEP = "­";
const hyphenate = createHyphenator(enUsPatterns, { hyphenChar: SEP, minWordLength: 2, html: false });

/** Classroom words where hyphenation ≠ syllabification. Keys are lowercase; values are chunk patterns. */
export const SYLLABLE_OVERRIDES: Readonly<Record<string, string>> = {
  every: "ev-ery",
  idea: "i-de-a",
  area: "ar-e-a",
  science: "sci-ence",
  poem: "po-em",
  ocean: "o-cean",
  animal: "an-i-mal",
  family: "fam-i-ly",
  different: "dif-fer-ent",
  interesting: "in-ter-est-ing",
  photosynthesis: "pho-to-syn-the-sis",
  chlorophyll: "chlo-ro-phyll",
  temperature: "tem-per-a-ture",
  government: "gov-ern-ment",
  independence: "in-de-pen-dence",
  molecule: "mol-e-cule",
  energy: "en-er-gy",
  oxygen: "ox-y-gen",
  carbon: "car-bon",
  dioxide: "di-ox-ide",
  // A few more that both libraries get wrong.
  evaporation: "e-vap-o-ra-tion",
  banana: "ba-na-na",
  tomato: "to-ma-to",
  chocolate: "choc-o-late",
  library: "li-brar-y",
  vitamin: "vi-ta-min",
  bacteria: "bac-te-ri-a",
  eleven: "e-lev-en",
  dinosaur: "di-no-saur",
  pyramid: "pyr-a-mid",
  scientist: "sci-en-tist",
  radio: "ra-di-o",
  video: "vid-e-o",
  piano: "pi-an-o",
  create: "cre-ate",
  really: "re-al-ly",
  usually: "u-su-al-ly",
  being: "be-ing",
  quiet: "qui-et",
  diet: "di-et",
  lion: "li-on",
  violin: "vi-o-lin",
  museum: "mu-se-um",
  theater: "the-a-ter",
  theatre: "the-a-tre",
  camera: "cam-er-a",
  america: "a-mer-i-ca",
  american: "a-mer-i-can",
  experiment: "ex-per-i-ment",
  nucleus: "nu-cle-us",
  glucose: "glu-cose",
  hydrogen: "hy-dro-gen",
  nitrogen: "ni-tro-gen",
  atmosphere: "at-mos-phere",
  electricity: "e-lec-tric-i-ty",
  society: "so-ci-e-ty",
  variety: "va-ri-e-ty",
  period: "pe-ri-od",
  material: "ma-te-ri-al",
  medium: "me-di-um",
  stadium: "sta-di-um",
};

const LATIN_WORD = /^[\p{Script=Latin}\p{N}'’\-]+$/u;
const EDGE_PUNCT = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;
const VOWELS = "aeiouàáâäãåæèéêëìíîïòóôöõøùúûüœ";
const PLAIN_VOWELS = "aeiou";
// Consonant pairs that start a syllable together (blends and digraphs).
const ONSETS = new Set([
  "bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "tr", "sl", "sm", "sn", "sp", "st", "sw",
  "sc", "sk", "ch", "sh", "th", "ph", "wh", "wr", "kn", "gn", "qu", "ll", "rr", "ñ",
]);
// Consonant pairs that close a syllable together.
const CODAS = new Set(["ck", "ng", "nk"]);

function stripPunct(word: string): string {
  return word.replace(/­/g, "").replace(EDGE_PUNCT, "");
}

function isVowelAt(lower: string, i: number): boolean {
  const c = lower[i] ?? "";
  if (c === "y") {
    if (i === 0) return false;
    const next = lower[i + 1] ?? "";
    return !PLAIN_VOWELS.includes(next);
  }
  if (c === "u" && (lower[i - 1] ?? "") === "q") return false;
  return VOWELS.includes(c);
}

/** Indexes of the vowel groups (start, end exclusive) of a lowercase chunk. */
function vowelGroups(lower: string): Array<[number, number]> {
  const groups: Array<[number, number]> = [];
  let i = 0;
  while (i < lower.length) {
    if (isVowelAt(lower, i)) {
      const start = i;
      while (i < lower.length && isVowelAt(lower, i)) i++;
      groups.push([start, i]);
    } else {
      i++;
    }
  }
  return groups;
}

/** Split a single chunk at natural syllable boundaries (vowel-group heuristic). Preserves case. */
export function splitVowelGroups(chunk: string): string[] {
  const lower = chunk.toLowerCase();
  if (lower.length < 3) return [chunk];
  let groups = vowelGroups(lower);
  if (groups.length < 2) return [chunk];

  const last = groups[groups.length - 1];
  const prev = groups[groups.length - 2];
  // Silent final "e" ("late", "makes", "jumped"): not a syllable nucleus, except "-Cle" ("ta-ble") and "-ted/-ded".
  if (last && prev) {
    const tail = lower.slice(last[0]);
    const consonantsBefore = last[0] - prev[1];
    const tailSilent = /^e(?:s|d)?$/.test(tail) && consonantsBefore >= 1;
    const isCle = /[^aeiou]le$/.test(lower) && consonantsBefore >= 2;
    const isTed = /[td]ed$/.test(lower);
    const isEs = /(?:[sxz]|[cs]h)es$/.test(lower);
    if (tailSilent && !isCle && !isTed && !isEs) groups = groups.slice(0, -1);
  }
  if (groups.length < 2) return [chunk];

  const cuts: number[] = [];
  for (let g = 0; g < groups.length - 1; g++) {
    const a = groups[g];
    const b = groups[g + 1];
    if (!a || !b) continue;
    const cStart = a[1];
    const cEnd = b[0];
    const cons = lower.slice(cStart, cEnd);
    const n = cons.length;
    // "-Cle" ending: the "le" syllable takes the consonant before it.
    if (g === groups.length - 2 && /[^aeiou]le$/.test(lower) && b[0] === lower.length - 1) {
      cuts.push(cEnd - 1);
      continue;
    }
    if (/[td]ed$/.test(lower) && g === groups.length - 2 && b[0] === lower.length - 2) {
      cuts.push(cEnd);
      continue;
    }
    if (n === 0) {
      cuts.push(cStart);
    } else if (n === 1) {
      cuts.push(cStart);
    } else if (n === 2) {
      if (CODAS.has(cons)) cuts.push(cEnd);
      else if (ONSETS.has(cons)) cuts.push(cStart);
      else cuts.push(cStart + 1);
    } else {
      const lastTwo = cons.slice(-2);
      if (ONSETS.has(lastTwo)) cuts.push(cEnd - 2);
      else cuts.push(cEnd - 1);
    }
  }
  const pieces: string[] = [];
  let from = 0;
  for (const cut of cuts) {
    if (cut <= from || cut >= chunk.length) continue;
    pieces.push(chunk.slice(from, cut));
    from = cut;
  }
  pieces.push(chunk.slice(from));
  return pieces.filter((p) => p.length > 0);
}

function applyPattern(word: string, pattern: string): string[] {
  const lengths = pattern.split("-").map((p) => p.length);
  const total = lengths.reduce((a, b) => a + b, 0);
  if (total !== word.length) return [word];
  const out: string[] = [];
  let i = 0;
  for (const len of lengths) {
    out.push(word.slice(i, i + len));
    i += len;
  }
  return out;
}

function hasVowel(chunk: string): boolean {
  const lower = chunk.toLowerCase();
  for (let i = 0; i < lower.length; i++) if (isVowelAt(lower, i)) return true;
  return false;
}

/** Merge chunks without a vowel into their neighbour so no visual chunk is unpronounceable ("vi-t-a-min" → "vit-a-min"). */
function mergeVowelless(chunks: string[]): string[] {
  const out: string[] = [];
  for (const chunk of chunks) {
    const last = out.length - 1;
    const prev = out[last];
    if (prev !== undefined && (!hasVowel(chunk) || !hasVowel(prev))) out[last] = `${prev}${chunk}`;
    else out.push(chunk);
  }
  return out;
}

function rawCount(lower: string): number {
  try {
    return Math.max(1, syllable(lower));
  } catch {
    return 1;
  }
}

/** Split chunks further (largest first) until the count is reached or nothing else can be split. */
function refine(chunks: string[], want: number): string[] {
  let current = chunks.slice();
  for (let guard = 0; guard < 8 && current.length < want; guard++) {
    let bestIndex = -1;
    let bestGroups = 1;
    current.forEach((c, i) => {
      const g = vowelGroups(c.toLowerCase()).length;
      if (g > bestGroups) {
        bestGroups = g;
        bestIndex = i;
      }
    });
    if (bestIndex < 0) break;
    const target = current[bestIndex];
    if (target === undefined) break;
    const pieces = splitVowelGroups(target);
    if (pieces.length < 2) {
      // Mark as unsplittable by replacing with itself in a way the loop will not retry.
      current = current.map((c, i) => (i === bestIndex ? c : c));
      break;
    }
    current = [...current.slice(0, bestIndex), ...pieces, ...current.slice(bestIndex + 1)];
  }
  return current;
}

function syllabifyPart(part: string, lang: string): string[] {
  if (!part) return [];
  const lower = part.toLowerCase();
  const override = SYLLABLE_OVERRIDES[lower];
  if (override) return applyPattern(part, override);
  // Alphanumerics and short all-caps acronyms are read as units ("CO2", "NASA").
  if (/\p{N}/u.test(part) || (/^\p{Lu}+$/u.test(part) && part.length <= 5)) return [part];
  if (lang !== "en") return mergeVowelless(splitVowelGroups(part));

  let chunks: string[];
  try {
    chunks = hyphenate(part).split(SEP).filter((c) => c.length > 0);
  } catch {
    chunks = [part];
  }
  if (chunks.length === 0) chunks = [part];
  chunks = mergeVowelless(chunks);
  if (/['’]/.test(part)) return chunks;
  const want = rawCount(lower);
  if (chunks.length < want) chunks = mergeVowelless(refine(chunks, want));
  return chunks;
}

/**
 * Visual syllable chunks for a word, preserving its capitalisation.
 * "Photosynthesis" → ["Pho","to","syn","the","sis"]; "don't" → ["don't"];
 * "co-operate" → ["co","op","er","ate"]; non-Latin words come back whole.
 */
export function syllabify(word: string, lang = "en"): string[] {
  if (typeof word !== "string") return [];
  const trimmed = word.trim();
  if (!trimmed) return [];
  const core = stripPunct(trimmed);
  if (!core) return [trimmed];
  if (!LATIN_WORD.test(core)) return [core];
  const parts = core.split(/[-‐‑]+/).filter((p) => p.length > 0);
  const out = parts.flatMap((p) => syllabifyPart(p, lang));
  return out.length > 0 ? out : [core];
}

/** Spoken syllable count: overrides first, then the `syllable` library (never below 1 for a word with letters). */
export function syllableCount(word: string): number {
  if (typeof word !== "string") return 0;
  const core = stripPunct(word.trim());
  if (!core) return 0;
  if (!/\p{L}/u.test(core)) return 0;
  if (!LATIN_WORD.test(core)) return 1;
  const parts = core.split(/[-‐‑]+/).filter((p) => p.length > 0);
  let total = 0;
  for (const part of parts) {
    const lower = part.toLowerCase();
    const override = SYLLABLE_OVERRIDES[lower];
    if (override) total += override.split("-").length;
    else if (/\p{N}/u.test(part)) total += Math.max(1, (part.match(/\p{L}/gu) ?? []).length);
    else total += rawCount(lower);
  }
  return Math.max(1, total);
}
