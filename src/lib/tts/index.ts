import type { TtsEngine } from "./types";
import { WebSpeechEngine } from "./web-speech";

export type { SpeakUnit, TtsEngine, TtsListeners, TtsState, VoiceInfo } from "./types";
export { RATE_DEFAULT, RATE_MAX, RATE_MIN } from "./types";
export { clampRate } from "./util";

// Browser voices by default. A cloud provider can be added here and selected
// with NEXT_PUBLIC_TTS_PROVIDER without touching the reader.
export function createTtsEngine(provider: string | undefined = process.env.NEXT_PUBLIC_TTS_PROVIDER): TtsEngine {
  switch (provider) {
    case "web":
    case undefined:
    case "":
      return new WebSpeechEngine();
    default:
      console.warn(`[tts] unknown provider "${provider}", using browser voices`);
      return new WebSpeechEngine();
  }
}
