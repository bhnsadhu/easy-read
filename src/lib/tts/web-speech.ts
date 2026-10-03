import { RATE_DEFAULT, type SpeakUnit, type TtsEngine, type TtsListeners, type TtsState, type VoiceInfo } from "./types";
import { clampRate, estimateWordIndex, isMobileSpeechPlatform, pickVoice, splitForUtterance, wordSpans } from "./util";

// A one-sample silent WAV. Playing it inside the first tap puts iOS into the
// "playback" audio session so speech is heard with the mute switch on.
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

type Synth = Pick<SpeechSynthesis, "speak" | "cancel" | "pause" | "resume" | "getVoices" | "speaking" | "paused" | "addEventListener" | "removeEventListener">;

export class WebSpeechEngine implements TtsEngine {
  readonly available: boolean;
  state: TtsState = "idle";
  currentIndex = 0;

  private synth: Synth | null;
  private units: SpeakUnit[] = [];
  private listeners: TtsListeners = {};
  private rate = RATE_DEFAULT;
  private voice: SpeechSynthesisVoice | null = null;
  private voiceId: string | null = null;
  private lang = "en";
  private mobile: boolean;
  private generation = 0;
  private estimateTimer: ReturnType<typeof setInterval> | null = null;
  private boundaryTimer: ReturnType<typeof setTimeout> | null = null;
  private unlocked = false;
  private visibilityHandler: (() => void) | null = null;
  private nativePaused = false;

  constructor(opts: { synth?: Synth; userAgent?: string; maxTouchPoints?: number } = {}) {
    const w = typeof window !== "undefined" ? window : null;
    this.synth = opts.synth ?? (w && "speechSynthesis" in w ? w.speechSynthesis : null);
    this.available = Boolean(this.synth && (typeof SpeechSynthesisUtterance !== "undefined"));
    if (!this.available) this.state = "unavailable";
    this.mobile = isMobileSpeechPlatform(opts.userAgent ?? (w?.navigator.userAgent ?? ""), opts.maxTouchPoints ?? (w?.navigator.maxTouchPoints ?? 0));
    if (w) {
      this.visibilityHandler = () => {
        // Mobile browsers stop speech when the screen locks or the app switches;
        // record the place so "resume" picks up where the voice stopped.
        if (document.visibilityState === "hidden" && this.state === "playing" && this.mobile) this.pause();
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }
  }

  setListeners(l: TtsListeners) {
    this.listeners = l;
  }

  async load(lang: string): Promise<VoiceInfo[]> {
    this.lang = lang;
    if (!this.synth) return [];
    let list = this.synth.getVoices();
    if (!list.length) {
      list = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
        const synth = this.synth!;
        const done = () => {
          synth.removeEventListener("voiceschanged", done);
          clearTimeout(t);
          resolve(synth.getVoices());
        };
        const t = setTimeout(done, 1500);
        synth.addEventListener("voiceschanged", done);
      });
    }
    const infos = this.voices();
    const chosen = pickVoice(infos, lang, this.voiceId);
    this.voice = chosen ? (list.find((v) => v.voiceURI === chosen.id) ?? null) : null;
    return infos;
  }

  voices(): VoiceInfo[] {
    if (!this.synth) return [];
    return this.synth.getVoices().map((v) => ({ id: v.voiceURI, name: v.name, lang: v.lang, local: v.localService }));
  }

  setVoice(id: string | null) {
    this.voiceId = id;
    if (!this.synth) return;
    const chosen = pickVoice(this.voices(), this.lang, id);
    this.voice = chosen ? (this.synth.getVoices().find((v) => v.voiceURI === chosen.id) ?? null) : null;
    if (this.state === "playing") this.restartCurrent();
  }

  setRate(rate: number) {
    const next = clampRate(rate);
    if (next === this.rate) return;
    this.rate = next;
    if (this.state === "playing") this.restartCurrent();
  }

  play(units: SpeakUnit[], startIndex = 0) {
    if (!this.synth) return;
    this.unlock();
    this.units = units;
    this.currentIndex = Math.min(Math.max(0, startIndex), Math.max(0, units.length - 1));
    this.cancelAll();
    this.setState("playing");
    this.speakCurrent();
  }

  seek(index: number) {
    if (!this.units.length) return;
    const wasPlaying = this.state === "playing";
    this.currentIndex = Math.min(Math.max(0, index), this.units.length - 1);
    if (wasPlaying) {
      this.cancelAll();
      this.speakCurrent();
    } else {
      this.listeners.onUnitStart?.(this.currentIndex, this.units[this.currentIndex]!);
    }
  }

  pause() {
    if (!this.synth || this.state !== "playing") return;
    this.clearTimers();
    if (this.mobile) {
      // pause()/resume() are unreliable on iOS and Android: cancel and remember the sentence.
      this.cancelAll();
      this.nativePaused = false;
    } else {
      this.synth.pause();
      this.nativePaused = true;
    }
    this.setState("paused");
  }

  resume() {
    if (!this.synth || this.state !== "paused") return;
    this.unlock();
    if (this.nativePaused) {
      this.synth.resume();
      this.nativePaused = false;
      this.setState("playing");
      // Chrome drops an utterance paused for more than ~15 s; detect and restart the sentence.
      const gen = this.generation;
      setTimeout(() => {
        if (gen === this.generation && this.state === "playing" && !this.synth!.speaking) this.restartCurrent();
      }, 300);
      return;
    }
    this.setState("playing");
    this.speakCurrent();
  }

  stop() {
    this.cancelAll();
    this.currentIndex = 0;
    this.setState("idle");
  }

  dispose() {
    this.cancelAll();
    if (this.visibilityHandler) document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.listeners = {};
  }

  // ---- internals

  private unlock() {
    if (this.unlocked || typeof Audio === "undefined") return;
    this.unlocked = true;
    try {
      const a = new Audio(SILENT_WAV);
      a.volume = 0.01;
      void a.play().catch(() => undefined);
    } catch {
      /* ignore */
    }
  }

  private setState(s: TtsState) {
    if (this.state === s) return;
    this.state = s;
    this.listeners.onState?.(s);
  }

  private clearTimers() {
    if (this.estimateTimer) clearInterval(this.estimateTimer);
    if (this.boundaryTimer) clearTimeout(this.boundaryTimer);
    this.estimateTimer = null;
    this.boundaryTimer = null;
  }

  private cancelAll() {
    this.generation++;
    this.clearTimers();
    this.nativePaused = false;
    try {
      this.synth?.cancel();
    } catch {
      /* ignore */
    }
  }

  private restartCurrent() {
    this.cancelAll();
    this.setState("playing");
    this.speakCurrent();
  }

  private speakCurrent() {
    const unit = this.units[this.currentIndex];
    if (!unit || !this.synth) {
      this.setState("ended");
      return;
    }
    const gen = this.generation;
    const index = this.currentIndex;
    this.listeners.onUnitStart?.(index, unit);
    const chunks = splitForUtterance(unit.text);
    let chunkIdx = 0;
    const spans = wordSpans(unit.text);

    const speakChunk = () => {
      if (gen !== this.generation) return;
      const chunk = chunks[chunkIdx];
      if (!chunk) {
        this.clearTimers();
        this.listeners.onUnitEnd?.(index, unit);
        this.currentIndex = index + 1;
        if (this.currentIndex >= this.units.length) {
          this.setState("ended");
          return;
        }
        this.speakCurrent();
        return;
      }
      const u = new SpeechSynthesisUtterance(chunk.text);
      u.rate = this.rate;
      u.lang = this.voice?.lang ?? this.lang;
      if (this.voice) u.voice = this.voice;
      let boundarySeen = false;
      const startedAt = Date.now();
      u.onboundary = (e) => {
        if (gen !== this.generation) return;
        if (e.name && e.name !== "word") return;
        boundarySeen = true;
        if (this.estimateTimer) {
          clearInterval(this.estimateTimer);
          this.estimateTimer = null;
        }
        const charIndex = chunk.offset + e.charIndex;
        const len = e.charLength && e.charLength > 0 ? e.charLength : (spans.find((s) => s.charIndex === charIndex)?.charLength ?? 1);
        this.listeners.onWord?.(index, charIndex, len, false);
      };
      u.onend = () => {
        if (gen !== this.generation) return;
        chunkIdx++;
        speakChunk();
      };
      u.onerror = (e) => {
        if (gen !== this.generation) return;
        if (e.error === "interrupted" || e.error === "canceled") return;
        this.clearTimers();
        this.listeners.onError?.(e.error || "speech failed");
        this.setState("idle");
      };
      // If no word boundary arrives soon (iOS, Android, some Firefox builds),
      // estimate the position from elapsed time; resync happens at each chunk end.
      this.clearTimers();
      this.boundaryTimer = setTimeout(() => {
        if (gen !== this.generation || boundarySeen || this.state !== "playing") return;
        const chunkSpans = wordSpans(chunk.text);
        this.estimateTimer = setInterval(() => {
          if (gen !== this.generation || this.state !== "playing") return;
          const i = estimateWordIndex(Date.now() - startedAt, chunkSpans, this.rate);
          const s = chunkSpans[i];
          if (s) this.listeners.onWord?.(index, chunk.offset + s.charIndex, s.charLength, true);
        }, 120);
      }, 700);
      this.synth!.speak(u);
    };
    speakChunk();
  }
}
