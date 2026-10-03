"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { SAMPLES, type Sample } from "@/lib/samples";
import { chunkIntoSections, structureText } from "@/lib/text/chunk";
import { simplifyContent, type Level } from "@/lib/text/simplify";
import { estimateReadability, plainText } from "@/lib/text/readability";
import { pickKeyWords } from "@/lib/text/wordpreview";
import { syllabify } from "@/lib/text/syllables";
import { createTtsEngine, type SpeakUnit, type TtsEngine, type TtsState } from "@/lib/tts";
import type { SectionContent } from "@/lib/content/types";

// The whole adaptation runs in the browser here (no server, no account), so
// judges can click a sample and see the result instantly.
function adapt(text: string, level: Level) {
  const sections = chunkIntoSections(structureText(text));
  return sections.map((s) => {
    const adapted = simplifyContent(s.original, level);
    const words = pickKeyWords(plainText(s.original), 4).map((w) => ({ word: w, syllables: syllabify(w) }));
    return { title: s.title, original: s.original, adapted, words };
  });
}

type Font = "default" | "lexend" | "opendyslexic";
type Bg = "cream" | "blue" | "dark";

function units(sections: { title: string; adapted: SectionContent }[]): SpeakUnit[] {
  const out: SpeakUnit[] = [];
  sections.forEach((s, si) => {
    out.push({ id: `${si}-t`, text: s.title });
    s.adapted.blocks.forEach((b, bi) => {
      if (b.type === "heading") out.push({ id: `${si}-${bi}-0`, text: b.text });
      else if (b.type === "paragraph") b.sentences.forEach((t, k) => out.push({ id: `${si}-${bi}-${k}`, text: t }));
      else if (b.type === "list") b.items.forEach((it, k) => out.push({ id: `${si}-${bi}-${k}`, text: it.join(" ") }));
    });
  });
  return out;
}

export function BeforeAfter() {
  const router = useRouter();
  const [sample, setSample] = useState<Sample>(SAMPLES[0]!);
  const [level, setLevel] = useState<Level>("simple");
  const [state, setState] = useState<TtsState>("idle");
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [font, setFont] = useState<Font>("default");
  const [size, setSize] = useState(19);
  const [bg, setBg] = useState<Bg>("cream");
  const engine = useRef<TtsEngine | null>(null);

  const sections = useMemo(() => adapt(sample.text, level), [sample, level]);
  const speakUnits = useMemo(() => units(sections), [sections]);
  const before = useMemo(() => estimateReadability(sample.text).grade, [sample]);
  const after = useMemo(() => estimateReadability(sections.map((s) => plainText(s.adapted)).join("\n")).grade, [sections]);

  useEffect(() => {
    const e = createTtsEngine();
    engine.current = e;
    e.setListeners({ onState: setState, onUnitStart: (i, u) => setCurrent(u.id) });
    void e.load("en");
    return () => e.dispose();
  }, []);

  const choose = (next: Partial<{ sample: Sample; level: Level }>) => {
    engine.current?.stop();
    setCurrent(null);
    if (next.sample) setSample(next.sample);
    if (next.level) setLevel(next.level);
  };

  const toggle = () => {
    const e = engine.current;
    if (!e) return;
    if (state === "playing") e.pause();
    else if (state === "paused") e.resume();
    else e.play(speakUnits, 0);
  };

  async function makeLink() {
    setBusy(true);
    try {
      const res = await fetch("/api/materials", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: sample.text, title: sample.title, sourceType: "paste", piiAcknowledged: true, allowDuplicate: true }) });
      const data = (await res.json()) as { id?: string };
      if (data.id) router.push(`/materials/${data.id}/review`);
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  const Sentence = ({ id, text }: { id: string; text: string }) => (
    <span
      id={`ba-${id}`}
      onClick={() => engine.current?.play(speakUnits, Math.max(0, speakUnits.findIndex((u) => u.id === id)))}
      className={clsx("cursor-pointer rounded-sm px-0.5 transition-colors duration-fast", current === id && state === "playing" && "bg-highlight text-on-highlight shadow-[inset_4px_0_0_var(--color-highlight-bar)]")}
    >
      {text}{" "}
    </span>
  );

  return (
    <section aria-labelledby="demo-h" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span id="demo-h" className="mr-1 text-sm font-bold text-ink-muted">Pick a reading:</span>
        {SAMPLES.map((s) => (
          <button key={s.id} type="button" onClick={() => choose({ sample: s })} aria-pressed={sample.id === s.id} className={clsx("rounded-full border px-4 py-2 text-sm font-bold transition-colors duration-fast", sample.id === s.id ? "border-accent bg-accent text-on-accent" : "border-border-strong bg-surface-raised hover:border-accent")}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Before</h2>
            <span className="rounded-full bg-danger-soft px-3 py-1 text-sm font-bold text-danger">reads at ≈ grade {before ?? "12+"}</span>
          </div>
          <div tabIndex={0} role="region" className="h-[520px] overflow-auto rounded-lg border border-border-strong bg-surface-sunken p-5" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 13, lineHeight: 1.2, textAlign: "justify", letterSpacing: 0 }} aria-label="Original reading">
            {sample.text.split("\n").map((line, i) => (
              <p key={i} className={i === 0 ? "mb-2 font-bold" : "mb-2"}>{line}</p>
            ))}
          </div>
          <p className="text-sm text-ink-muted">The handout as a student gets it: dense, small, long sentences, no help.</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">After, with ReadEasy</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-success-soft px-3 py-1 text-sm font-bold text-success">reads at ≈ grade {after ?? "?"}</span>
              <div role="group" aria-label="Level" className="flex rounded-full border border-border-strong p-0.5">
                {(["medium", "simple"] as Level[]).map((l) => (
                  <button key={l} type="button" aria-pressed={level === l} onClick={() => choose({ level: l })} className={clsx("rounded-full px-3 py-1 text-sm font-bold", level === l ? "bg-accent text-on-accent" : "text-ink-muted")}>{l === "medium" ? "Plain" : "Simple"}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Reading settings">
            {([["default", "Atkinson"], ["lexend", "Lexend"], ["opendyslexic", "OpenDyslexic"]] as const).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={font === v} onClick={() => setFont(v)} className={clsx("rounded-md border px-2.5 py-1 font-bold", font === v ? "border-accent bg-accent-soft" : "border-border-strong")}>{label}</button>
            ))}
            <span className="mx-1 text-ink-faint">|</span>
            <button type="button" aria-label="Smaller text" onClick={() => setSize((n) => Math.max(15, n - 2))} className="rounded-md border border-border-strong px-2.5 py-1 font-bold">A−</button>
            <button type="button" aria-label="Bigger text" onClick={() => setSize((n) => Math.min(30, n + 2))} className="rounded-md border border-border-strong px-2.5 py-1 font-bold">A+</button>
            <span className="mx-1 text-ink-faint">|</span>
            {([["cream", "Cream"], ["blue", "Blue"], ["dark", "Dark"]] as const).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={bg === v} onClick={() => setBg(v)} className={clsx("rounded-md border px-2.5 py-1 font-bold", bg === v ? "border-accent bg-accent-soft" : "border-border-strong")}>{label}</button>
            ))}
          </div>
          <div data-reading-bg={bg} className={clsx("h-[520px] overflow-auto rounded-lg border border-border bg-surface p-5 text-ink", font === "lexend" ? "font-lexend" : font === "opendyslexic" ? "font-opendyslexic" : "font-sans")} tabIndex={0} role="region" style={{ fontSize: size, lineHeight: 1.6, letterSpacing: "0.04em", wordSpacing: "0.16em", maxWidth: "100%" }} aria-label="Adapted reading">
            {sections.map((s, si) => (
              <section key={si} className="mb-8">
                <h3 className="mb-2 text-xl font-bold"><Sentence id={`${si}-t`} text={s.title} /></h3>
                {s.words.length > 0 && (
                  <p className="mb-4 flex flex-wrap gap-2" style={{ fontSize: "0.8em" }} aria-label="Key words with syllables">
                    {s.words.map((w) => <span key={w.word} className="rounded-full border border-border-strong bg-surface-raised px-2.5 py-0.5"><span className="font-bold">{w.word}</span> <span className="text-ink-muted">{w.syllables.join("·")}</span></span>)}
                  </p>
                )}
                <div className="flex flex-col gap-5">
                  {s.adapted.blocks.map((b, bi) => {
                    if (b.type === "heading") return <p key={bi} className="font-bold"><Sentence id={`${si}-${bi}-0`} text={b.text} /></p>;
                    if (b.type === "paragraph") return <p key={bi}>{b.sentences.map((t, k) => <Sentence key={k} id={`${si}-${bi}-${k}`} text={t} />)}</p>;
                    if (b.type === "list") return <ul key={bi} className="list-disc pl-7">{b.items.map((it, k) => <li key={k}><Sentence id={`${si}-${bi}-${k}`} text={it.join(" ")} /></li>)}</ul>;
                    return null;
                  })}
                </div>
              </section>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={toggle} aria-label={state === "playing" ? "Pause" : "Listen"} className="flex h-12 items-center gap-2 rounded-full bg-accent px-5 font-bold text-on-accent shadow-float">
              {state === "playing" ? <Pause size={22} /> : <Play size={22} />}
              {state === "playing" ? "Pause" : "Listen"}
            </button>
            <span className="text-sm text-ink-muted">Each sentence lights up as it is read. Tap any sentence to start there.</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-raised p-4">
        <p className="grow font-bold">Want the student link, QR code, and settings for this reading?</p>
        <Button size="lg" loading={busy} onClick={() => void makeLink()}>Make the class version</Button>
      </div>
    </section>
  );
}
