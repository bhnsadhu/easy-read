import type { ExtractedDocument } from "@/lib/content/types";
import { IngestError } from "./errors";

export const TEXT_CAP_CHARS = 200_000;
export const MIN_WORDS = 20;

// Control characters other than tab and newline, plus the BOM.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\ufeff]/g;

export function normaliseText(raw: string): string {
  let text = raw.replace(/\r\n?/g, "\n").replace(/[\u2028\u2029]/g, "\n");
  text = text.replace(CONTROL_CHARS, "");
  // Trailing whitespace on each line, non-breaking spaces to plain spaces.
  text = text.replace(/\u00a0/g, " ").replace(/[ \t]+$/gm, "");
  // More than two blank lines in a row collapse to two.
  text = text.replace(/\n{4,}/g, "\n\n\n");
  return text.trim();
}

export function countWords(text: string): number {
  let n = 0;
  for (const token of text.split(/\s+/)) {
    if (/[\p{L}\p{N}]/u.test(token)) n++;
  }
  return n;
}

export function capText(text: string, warnings: string[]): string {
  if (text.length <= TEXT_CAP_CHARS) return text;
  let cut = text.lastIndexOf(" ", TEXT_CAP_CHARS);
  if (cut < TEXT_CAP_CHARS * 0.9) cut = TEXT_CAP_CHARS;
  warnings.push(
    `That text is very long, so we kept the first ${TEXT_CAP_CHARS.toLocaleString("en-US")} characters. Upload the rest as a second reading.`,
  );
  return text.slice(0, cut).trimEnd();
}

// Pasted or plain-text input to the shared document shape.
export function extractText(raw: string): ExtractedDocument {
  const warnings: string[] = [];
  const text = capText(normaliseText(raw), warnings);
  if (countWords(text) < MIN_WORDS) {
    throw new IngestError("too_short");
  }
  return { text, language: detectLanguage(text), warnings };
}

// Stopword lists: common function words that are frequent and reasonably
// distinctive for each language. Overlaps are fine; the ratio decides.
const STOPWORDS: Record<string, string[]> = {
  en: "the and of to in is that it for on with as was are be this by from at or an not have has they which their were will would can there what when than into these its been also about because how where each some many most more does did".split(" "),
  es: "el la los las de del que y en un una es por para con se su sus al lo como más pero también hay está son fue este esta cuando muy sin sobre todo todos desde donde porque entre hasta ser ya ni cada puede pueden tiene tienen esto eso otros otras así".split(" "),
  fr: "le la les de des du et en un une est que qui dans pour pas sur avec ce cette ces il elle ils elles nous vous sont au aux par plus ne se son sa ses leur leurs mais ou où comme été être fait aussi très tout tous cela ont".split(" "),
  de: "der die das und ist in den von zu mit sich des auf für nicht ein eine einer als auch es an werden aus er hat dass sie nach wird bei einem einen um am sind noch wie über so zum zur oder aber wenn durch kann diese dieser ihre".split(" "),
  pt: "o a os as de do da dos das e é em um uma para com não que se por mais como mas ao aos foi são também pelo pela seu sua seus suas ou quando muito já está ser tem há entre isso esse essa ele ela nos no na às".split(" "),
  it: "il lo la i gli le di del della dei delle e ed è in un una uno per con che non si da al alla come più ma anche sono questo questa questi sua suo nel nella degli dal dalla ha hanno essere tra fra molto quando se o".split(" "),
  nl: "de het een en van is in dat op te zijn met voor niet aan er ook als maar om bij dan nog uit door naar over wordt worden heeft hebben kan deze dit die zij hij wij we ze al wat meer veel tot geen zo onder tussen".split(" "),
};

const STOPWORD_SETS: [string, Set<string>][] = Object.entries(STOPWORDS).map(([lang, words]) => [lang, new Set(words)]);

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿ]/g;
const HEBREW = /[֐-׿]/g;
const PERSIAN_ONLY = /[پچژگ]/; // پ چ ژ گ
const URDU_ONLY = /[ٹڈڑںھے]/; // ٹ ڈ ڑ ں ھ ے

// ISO 639-1 code from a stopword-ratio heuristic. Defaults to "en".
export function detectLanguage(text: string): string {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  if (letters === 0) return "en";

  const arabic = text.match(ARABIC)?.length ?? 0;
  const hebrew = text.match(HEBREW)?.length ?? 0;
  if (hebrew / letters >= 0.3) return "he";
  if (arabic / letters >= 0.3) {
    if (URDU_ONLY.test(text)) return "ur";
    if (PERSIAN_ONLY.test(text)) return "fa";
    return "ar";
  }

  const tokens = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (tokens.length === 0) return "en";

  let best = "en";
  let bestScore = 0;
  for (const [lang, set] of STOPWORD_SETS) {
    let hits = 0;
    for (const t of tokens) if (set.has(t)) hits++;
    const score = hits / tokens.length;
    if (score > bestScore) {
      best = lang;
      bestScore = score;
    }
  }
  // Too little evidence to call it: assume English.
  return bestScore >= 0.04 ? best : "en";
}

const RTL = new Set(["ar", "he", "fa", "ur"]);

export function isRtl(lang: string | undefined): boolean {
  if (!lang) return false;
  const base = lang.toLowerCase().split(/[-_]/)[0] ?? "";
  return RTL.has(base);
}
