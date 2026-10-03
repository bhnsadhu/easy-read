import { BASE_WPM, RATE_MAX, RATE_MIN, type VoiceInfo } from "./types";

export function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) return 1;
  return Math.min(RATE_MAX, Math.max(RATE_MIN, Math.round(rate * 20) / 20));
}

export type WordSpan = { charIndex: number; charLength: number };

export function wordSpans(text: string): WordSpan[] {
  const spans: WordSpan[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) spans.push({ charIndex: m.index, charLength: m[0].length });
  return spans;
}

// Which word is being spoken after `elapsedMs`, assuming a steady cadence
// scaled by rate. Longer words get proportionally more time.
export function estimateWordIndex(elapsedMs: number, spans: WordSpan[], rate: number): number {
  if (!spans.length) return 0;
  const totalChars = spans.reduce((a, s) => a + s.charLength + 1, 0);
  const wordsPerMs = (BASE_WPM * rate) / 60_000;
  const totalMs = spans.length / wordsPerMs;
  const progress = Math.min(1, Math.max(0, elapsedMs / totalMs));
  let acc = 0;
  for (let i = 0; i < spans.length; i++) {
    acc += spans[i]!.charLength + 1;
    if (acc / totalChars >= progress) return i;
  }
  return spans.length - 1;
}

export function estimateDurationMs(text: string, rate: number): number {
  const words = wordSpans(text).length || 1;
  return (words / ((BASE_WPM * rate) / 60)) * 1000;
}

// Chrome stops network voices after ~15 s. Keep each utterance under ~200
// characters by splitting long sentences at punctuation.
export const MAX_UTTERANCE_CHARS = 200;

export function splitForUtterance(text: string, max = MAX_UTTERANCE_CHARS): { text: string; offset: number }[] {
  if (text.length <= max) return [{ text, offset: 0 }];
  const parts: { text: string; offset: number }[] = [];
  let start = 0;
  while (text.length - start > max) {
    const window = text.slice(start, start + max);
    let cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "), window.lastIndexOf(" – "), window.lastIndexOf(" — "));
    if (cut < max * 0.4) cut = window.lastIndexOf(" ");
    if (cut <= 0) cut = max;
    const end = start + cut + 1;
    parts.push({ text: text.slice(start, end).trim(), offset: start });
    start = end;
  }
  parts.push({ text: text.slice(start).trim(), offset: start });
  return parts.filter((p) => p.text.length > 0);
}

// Prefer an on-device voice in the material's language; the Chrome OS and iOS
// built-in voices are both reliable and work offline.
export function pickVoice(voices: VoiceInfo[], lang: string, preferredId?: string | null): VoiceInfo | null {
  if (preferredId) {
    const chosen = voices.find((v) => v.id === preferredId);
    if (chosen) return chosen;
  }
  const base = lang.toLowerCase().split("-")[0] ?? "en";
  const matches = voices.filter((v) => v.lang.toLowerCase().split(/[-_]/)[0] === base);
  const pool = matches.length ? matches : voices;
  if (!pool.length) return null;
  const score = (v: VoiceInfo) => {
    let s = 0;
    if (v.local) s += 10;
    if (/google|microsoft|samantha|daniel|karen|moira|alex|siri|natural|premium|enhanced/i.test(v.name)) s += 3;
    if (/espeak|compact|novelty|whisper|bells|cellos|bad news|good news|zarvox|trinoids/i.test(v.name)) s -= 8;
    if (v.lang.toLowerCase() === lang.toLowerCase()) s += 2;
    if (base === "en" && /en-(us|gb)/i.test(v.lang)) s += 1;
    return s;
  };
  return [...pool].sort((a, b) => score(b) - score(a))[0] ?? null;
}

export function isMobileSpeechPlatform(ua: string, maxTouchPoints = 0): boolean {
  return /iPhone|iPad|iPod|Android/i.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
}
