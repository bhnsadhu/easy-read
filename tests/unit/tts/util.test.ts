import { describe, expect, it } from "vitest";
import { clampRate, estimateDurationMs, estimateWordIndex, isMobileSpeechPlatform, pickVoice, splitForUtterance, wordSpans } from "@/lib/tts/util";

describe("tts utils", () => {
  it("clamps and snaps rate to the safe range", () => {
    expect(clampRate(0.1)).toBe(0.5);
    expect(clampRate(3)).toBe(1.5);
    expect(clampRate(1.03)).toBe(1.05);
    expect(clampRate(Number.NaN)).toBe(1);
  });

  it("finds word spans with offsets", () => {
    expect(wordSpans("In 1779, Jan")).toEqual([
      { charIndex: 0, charLength: 2 },
      { charIndex: 3, charLength: 5 },
      { charIndex: 9, charLength: 3 },
    ]);
  });

  it("estimates word position monotonically and within bounds", () => {
    const spans = wordSpans("one two three four five six seven eight nine ten");
    const total = estimateDurationMs("one two three four five six seven eight nine ten", 1);
    let last = -1;
    for (let t = 0; t <= total; t += total / 20) {
      const i = estimateWordIndex(t, spans, 1);
      expect(i).toBeGreaterThanOrEqual(last);
      expect(i).toBeLessThan(spans.length);
      last = i;
    }
    expect(estimateWordIndex(0, spans, 1)).toBe(0);
    expect(estimateWordIndex(total * 2, spans, 1)).toBe(9);
    expect(estimateWordIndex(total / 2, spans, 2)).toBe(9);
  });

  it("splits long sentences at punctuation under the limit, preserving offsets", () => {
    const text = `${"word ".repeat(30)}, ${"more ".repeat(30)}; ${"tail ".repeat(10)}`.trim();
    const parts = splitForUtterance(text, 120);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) {
      expect(p.text.length).toBeLessThanOrEqual(121);
      expect(text.slice(p.offset, p.offset + p.text.length)).toBe(p.text);
    }
    expect(splitForUtterance("short")).toEqual([{ text: "short", offset: 0 }]);
  });

  it("prefers local voices in the right language and avoids novelty voices", () => {
    const voices = [
      { id: "a", name: "Google US English", lang: "en-US", local: false },
      { id: "b", name: "Chrome OS US English", lang: "en-US", local: true },
      { id: "c", name: "Bad News", lang: "en-US", local: true },
      { id: "d", name: "Mónica", lang: "es-ES", local: true },
      { id: "e", name: "eSpeak Spanish", lang: "es", local: true },
    ];
    expect(pickVoice(voices, "en")?.id).toBe("b");
    expect(pickVoice(voices, "es")?.id).toBe("d");
    expect(pickVoice(voices, "fr")?.id).toBe("b");
    expect(pickVoice(voices, "en", "a")?.id).toBe("a");
    expect(pickVoice([], "en")).toBeNull();
  });

  it("detects mobile speech platforms including iPadOS desktop mode", () => {
    expect(isMobileSpeechPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
    expect(isMobileSpeechPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe(true);
    expect(isMobileSpeechPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe(false);
    expect(isMobileSpeechPlatform("Mozilla/5.0 (X11; CrOS x86_64)")).toBe(false);
  });
});
