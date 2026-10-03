// One speakable unit = one sentence (or heading, list item, option). Reading
// aloud chains one utterance per unit, which sidesteps every known browser bug
// with long utterances and gives sentence highlighting on every platform.
export type SpeakUnit = { id: string; text: string };

export type TtsState = "idle" | "playing" | "paused" | "ended" | "unavailable";

export type VoiceInfo = { id: string; name: string; lang: string; local: boolean };

export type TtsListeners = {
  onState?: (state: TtsState) => void;
  onUnitStart?: (index: number, unit: SpeakUnit) => void;
  onUnitEnd?: (index: number, unit: SpeakUnit) => void;
  // charIndex/charLength are offsets into unit.text. `estimated` means no boundary
  // event arrived and the position is inferred from elapsed time.
  onWord?: (index: number, charIndex: number, charLength: number, estimated: boolean) => void;
  onError?: (message: string) => void;
};

export interface TtsEngine {
  readonly available: boolean;
  readonly state: TtsState;
  readonly currentIndex: number;
  // Resolves when voices are known (or after a short timeout).
  load(lang: string): Promise<VoiceInfo[]>;
  voices(): VoiceInfo[];
  setVoice(id: string | null): void;
  setRate(rate: number): void;
  // Must be called synchronously inside a user gesture the first time (iOS).
  play(units: SpeakUnit[], startIndex?: number): void;
  pause(): void;
  resume(): void;
  stop(): void;
  seek(index: number): void;
  setListeners(l: TtsListeners): void;
  dispose(): void;
}

export const RATE_MIN = 0.5;
export const RATE_MAX = 1.5;
export const RATE_DEFAULT = 1;
// Speech engines average ~160 words per minute at rate 1. Used only for
// estimated word timing when boundary events do not fire.
export const BASE_WPM = 160;
