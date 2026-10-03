"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Settings2, SkipBack, Volume2, X } from "lucide-react";
import { clsx } from "clsx";
import { Sheet } from "@/components/ui/sheet";
import { LogoMark } from "@/components/ui/logo";
import type { PublicMaterial } from "@/lib/data/public";
import type { SectionContent } from "@/lib/content/types";
import { createTtsEngine, type SpeakUnit, type TtsEngine, type TtsState } from "@/lib/tts";
import { syllabify } from "@/lib/text/syllables";
import { sameText, withoutTitleHeading } from "@/lib/text/chunk";

type Level = "original" | "medium" | "simple";
const LEVEL_LABEL: Record<Level, string> = { original: "Original", medium: "Plain", simple: "Simple" };

type Prefs = { font: "default" | "lexend" | "opendyslexic"; size: number; letter: number; word: number; line: number; width: number; bg: "cream" | "blue" | "green" | "dark" | "contrast"; rate: number; ruler: boolean };
const DEFAULT_PREFS: Prefs = { font: "default", size: 18, letter: 0.05, word: 0.2, line: 1.5, width: 65, bg: "cream", rate: 1, ruler: false };
const PREFS_KEY = "readeasy:prefs";

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

type Unit = SpeakUnit & { section: number; block: number; sent: number };

type ReaderSection = PublicMaterial["sections"][number];

function contentFor(s: ReaderSection, level: Level): SectionContent {
  return withoutTitleHeading(level === "original" ? s.original : (s.levels[level] ?? s.original), s.title);
}

// The first section's title is not repeated when it matches the page title.
function showsTitle(s: ReaderSection, si: number, docTitle: string): boolean {
  return !(si === 0 && s.title && sameText(s.title, docTitle));
}

function flatten(sections: PublicMaterial["sections"], level: Level, docTitle: string): Unit[] {
  const units: Unit[] = [];
  sections.forEach((s, si) => {
    const content = contentFor(s, level);
    const title = s.title ?? `Part ${si + 1}`;
    if (showsTitle(s, si, docTitle)) units.push({ id: `${si}-t`, text: title, section: si, block: -1, sent: 0 });
    content.blocks.forEach((b, bi) => {
      const push = (text: string, sent: number) => units.push({ id: `${si}-${bi}-${sent}`, text, section: si, block: bi, sent });
      if (b.type === "heading") push(b.text, 0);
      else if (b.type === "paragraph") b.sentences.forEach((t, k) => push(t, k));
      else if (b.type === "list") b.items.forEach((item, k) => push(item.join(" "), k));
      else if (b.type === "math") push(b.text, 0);
      else if (b.type === "table") push(b.rows.map((r) => r.join(", ")).join(". "), 0);
      else if (b.type === "image") push(`Image: ${b.alt}`, 0);
    });
  });
  return units;
}

export function Reader({ material }: { material: PublicMaterial }) {
  const allowed = useMemo<Level[]>(() => ["original", ...material.supports.levels.filter((l) => material.sections.some((s) => s.levels[l]))] as Level[], [material]);
  const [level, setLevel] = useState<Level>(allowed.includes("medium") ? "medium" : "original");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [showWords, setShowWords] = useState(Boolean(material.word_preview?.length));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [state, setState] = useState<TtsState>("idle");
  const [current, setCurrent] = useState<number>(-1);
  const [word, setWord] = useState<{ unit: number; start: number; len: number } | null>(null);
  const [popover, setPopover] = useState<{ word: string; x: number; y: number } | null>(null);
  const [rulerY, setRulerY] = useState<number | null>(null);
  const [noVoices, setNoVoices] = useState(false);
  const engine = useRef<TtsEngine | null>(null);
  const units = useMemo(() => flatten(material.sections, level, material.title), [material.sections, level, material.title]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferences live only in this browser
    setPrefs(loadPrefs());
    const e = createTtsEngine();
    engine.current = e;
    e.setListeners({
      onState: setState,
      onUnitStart: (i) => {
        setCurrent(i);
        setWord(null);
        document.getElementById(`u-${units[i]?.id}`)?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      },
      onWord: (i, start, len) => setWord({ unit: i, start, len }),
      onError: () => setNoVoices(true),
    });
    void e.load(material.language).then((v) => setNoVoices(!e.available || v.length === 0));
    return () => e.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const savePrefs = useCallback((p: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...p };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      if (p.rate !== undefined) engine.current?.setRate(p.rate);
      return next;
    });
  }, []);

  const playFrom = (i: number) => {
    const e = engine.current;
    if (!e) return;
    e.setRate(prefs.rate);
    e.play(units, i);
  };
  const toggle = () => {
    const e = engine.current;
    if (!e) return;
    if (state === "playing") e.pause();
    else if (state === "paused") e.resume();
    else playFrom(current >= 0 ? current : 0);
  };
  const speakWord = (w: string) => {
    const e = engine.current;
    if (!e || !e.available) return;
    const clean = w.replace(/[^\p{L}\p{N}'-]/gu, "");
    if (!clean) return;
    const tmp = createTtsEngine();
    tmp.setRate(0.9);
    tmp.play([{ id: "w", text: clean }], 0);
  };

  const fontClass = prefs.font === "lexend" ? "font-lexend" : prefs.font === "opendyslexic" ? "font-opendyslexic" : "font-sans";
  const definition = (w: string) => material.word_preview?.find((e) => e.word.toLowerCase() === w.toLowerCase());
  const finished = state === "ended";

  return (
    <div data-reading-bg={prefs.bg} data-class-theme={material.class?.theme ?? "teal"} className="min-h-dvh bg-surface text-ink" dir={material.direction} onMouseMove={prefs.ruler ? (e) => setRulerY(e.clientY) : undefined} onTouchMove={prefs.ruler ? (e) => setRulerY(e.touches[0]?.clientY ?? null) : undefined}>
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <LogoMark size={24} />
            <span className="truncate text-sm text-ink-muted">{material.class?.name ?? "ReadEasy"}</span>
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Level">
            {allowed.map((l) => (
              <button key={l} type="button" onClick={() => { engine.current?.stop(); setCurrent(-1); setLevel(l); }} aria-pressed={level === l} className={clsx("rounded-full px-3 py-1.5 text-sm font-bold transition-colors duration-fast", level === l ? "bg-accent text-on-accent" : "text-ink-muted hover:bg-surface-sunken")}>{LEVEL_LABEL[l]}</button>
            ))}
          </div>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Reading settings" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-sunken"><Settings2 size={22} strokeWidth={1.75} /></button>
        </div>
      </header>

      <main className={clsx("mx-auto px-4 pb-40 pt-8", fontClass)} style={{ maxWidth: `${prefs.width}ch`, fontSize: prefs.size, lineHeight: prefs.line, letterSpacing: `${prefs.letter}em`, wordSpacing: `${prefs.word}em` }}>
        <h1 id="doc-title" className="mb-2 font-bold" style={{ fontSize: "1.5em", lineHeight: 1.25 }}>{material.title}</h1>
        {material.tldr && material.tldr.length > 0 && (
          <ul className="mb-8 list-disc rounded-lg bg-accent-soft/60 p-4 pl-9" style={{ fontSize: "0.95em" }}>{material.tldr.map((t, i) => <li key={i}>{t}</li>)}</ul>
        )}

        {showWords && material.word_preview && (
          <section className="mb-8 rounded-xl border border-border bg-surface-raised p-4" aria-labelledby="words-h">
            <div className="flex items-center justify-between"><h2 id="words-h" className="font-bold">Words to know</h2><button type="button" className="rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-surface-sunken" onClick={() => setShowWords(false)}>Skip</button></div>
            <ul className="mt-3 flex flex-col gap-3">
              {material.word_preview.map((w) => (
                <li key={w.word} className="flex items-start gap-3">
                  <button type="button" onClick={() => speakWord(w.word)} aria-label={`Hear ${w.word}`} className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent"><Volume2 size={20} /></button>
                  <div><p><span className="font-bold">{w.word}</span> <span className="text-ink-muted">{w.syllables.join(" · ")}</span></p>{w.definition ? <p style={{ fontSize: "0.95em" }}>{w.definition}</p> : <p className="text-ink-muted" style={{ fontSize: "0.9em" }}>Your teacher will explain this one.</p>}</div>
                </li>
              ))}
            </ul>
            <button type="button" className="mt-4 rounded-md bg-surface-sunken px-4 py-2 font-bold" onClick={() => setShowWords(false)}>Start reading</button>
          </section>
        )}

        {material.sections.map((s, si) => {
          const content = contentFor(s, level);
          const titled = showsTitle(s, si, material.title);
          const unitIndex = (id: string) => units.findIndex((u) => u.id === id);
          const Sentence = ({ id, text, as: Tag = "span" }: { id: string; text: string; as?: "span" | "h2" | "li" | "p" }) => {
            const i = unitIndex(id);
            const active = i === current && state !== "idle" && state !== "ended";
            const w = word && word.unit === i ? word : null;
            return (
              <Tag
                id={`u-${id}`}
                data-sentence
                onClick={(e: React.MouseEvent) => {
                  const sel = window.getSelection()?.toString();
                  if (sel && sel.trim().length) return;
                  const target = e.target as HTMLElement;
                  const tapped = target.dataset.word?.replace(/[^\p{L}\p{N}'-]/gu, "");
                  if (tapped) {
                    speakWord(tapped);
                    setPopover({ word: tapped, x: e.clientX, y: e.clientY });
                    return;
                  }
                  playFrom(i);
                }}
                className={clsx("cursor-pointer rounded-sm px-0.5 transition-colors duration-fast", active && "bg-highlight text-on-highlight shadow-[inset_4px_0_0_var(--color-highlight-bar)]", Tag === "span" && "mr-1")}
              >
                {text.split(/(\s+)/).map((part, k, arr) => {
                  if (!part.trim()) return part;
                  const offset = arr.slice(0, k).join("").length;
                  const hit = w && offset <= w.start && offset + part.length > w.start;
                  return <span key={k} data-word={part} className={clsx(hit && "underline decoration-highlight-bar decoration-2 underline-offset-4")}>{part}</span>;
                })}
              </Tag>
            );
          };
          return (
            <section key={s.id} className="mb-10" aria-labelledby={titled ? `sec-${si}` : "doc-title"}>
              {titled && <h2 id={`sec-${si}`} className="mb-1 font-bold" style={{ fontSize: "1.25em" }}><Sentence id={`${si}-t`} text={s.title ?? `Part ${si + 1}`} /></h2>}
              {s.about && <p className="mb-4 text-ink-muted" style={{ fontSize: "0.9em" }}>{s.about}</p>}
              <div className="flex flex-col" style={{ gap: "2em" }}>
                {content.blocks.map((b, bi) => {
                  if (b.type === "heading") return <p key={bi} className="font-bold" style={{ fontSize: "1.15em" }}><Sentence id={`${si}-${bi}-0`} text={b.text} /></p>;
                  if (b.type === "paragraph") return <p key={bi}>{b.sentences.map((t, k) => <Sentence key={k} id={`${si}-${bi}-${k}`} text={t} />)}</p>;
                  if (b.type === "list") return b.ordered ? <ol key={bi} className="list-decimal pl-8">{b.items.map((it, k) => <Sentence key={k} as="li" id={`${si}-${bi}-${k}`} text={it.join(" ")} />)}</ol> : <ul key={bi} className="list-disc pl-8">{b.items.map((it, k) => <Sentence key={k} as="li" id={`${si}-${bi}-${k}`} text={it.join(" ")} />)}</ul>;
                  if (b.type === "math") return <pre key={bi} className="whitespace-pre-wrap rounded-md bg-surface-sunken p-3"><Sentence id={`${si}-${bi}-0`} text={b.text} /></pre>;
                  if (b.type === "table") return <table key={bi} className="border-collapse"><tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} className="border border-border px-2 py-1">{c}</td>)}</tr>)}</tbody></table>;
                  return <p key={bi} className="text-ink-muted">Image: {b.alt}</p>;
                })}
              </div>
            </section>
          );
        })}

        {finished && (
          <section className="rounded-xl bg-accent-soft p-6 text-center">
            <p className="font-bold" style={{ fontSize: "1.25em" }}>Nice work. That&apos;s the whole reading.</p>
            {material.class && <a href={`/c/${material.class.handle}`} className="mt-3 inline-block rounded-full bg-accent px-5 py-2 font-bold text-on-accent">Back to {material.class.name}</a>}
          </section>
        )}
      </main>

      {popover && (
        <aside role="dialog" aria-label={`Word: ${popover.word}`} className="fixed inset-x-4 bottom-28 z-30 mx-auto max-w-md rounded-xl border border-border bg-surface-raised p-4 shadow-float">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-bold">{popover.word}</p>
              <p className="text-ink-muted">{syllabify(popover.word, material.language).join(" · ")}</p>
              {definition(popover.word)?.definition && <p className="mt-1">{definition(popover.word)!.definition}</p>}
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => speakWord(popover.word)} aria-label="Hear it again" className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-on-accent"><Volume2 size={20} /></button>
              <button type="button" onClick={() => setPopover(null)} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-sunken"><X size={20} /></button>
            </div>
          </div>
        </aside>
      )}

      {prefs.ruler && rulerY !== null && <div aria-hidden className="pointer-events-none fixed inset-x-0 z-10 h-10 border-y-2 border-highlight-bar/60 bg-highlight/20" style={{ top: rulerY - 20 }} />}

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Playback">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <button type="button" aria-label="Start over" onClick={() => playFrom(0)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-sunken"><SkipBack size={22} /></button>
          <button type="button" onClick={toggle} disabled={noVoices} aria-label={state === "playing" ? "Pause" : "Listen"} className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-on-accent shadow-float disabled:opacity-50">{state === "playing" ? <Pause size={30} /> : <Play size={30} className="ml-1" />}</button>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Speed</span>
            <select value={prefs.rate} onChange={(e) => savePrefs({ rate: Number(e.target.value) })} aria-label="Speed" className="h-11 rounded-md border border-border-strong bg-surface-raised px-2 font-bold">
              {[0.7, 0.85, 1, 1.15, 1.3, 1.5].map((r) => <option key={r} value={r}>{r === 1 ? "Normal" : `${r}×`}</option>)}
            </select>
          </label>
        </div>
        {noVoices && <p className="px-4 pb-2 text-center text-sm text-ink-muted">No voices on this device yet. You can still read along.</p>}
      </footer>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen} title="Reading settings">
        <div className="flex flex-col gap-5">
          <fieldset><legend className="mb-2 font-bold">Font</legend><div className="flex flex-wrap gap-2">{([["default", "Atkinson"], ["lexend", "Lexend"], ["opendyslexic", "OpenDyslexic"]] as const).map(([v, label]) => <button key={v} type="button" aria-pressed={prefs.font === v} onClick={() => savePrefs({ font: v })} className={clsx("rounded-md border px-3 py-2", prefs.font === v ? "border-accent bg-accent-soft" : "border-border-strong")}>{label}</button>)}</div></fieldset>
          <fieldset><legend className="mb-2 font-bold">Background</legend><div className="flex flex-wrap gap-2">{([["cream", "Cream"], ["blue", "Pale blue"], ["green", "Soft green"], ["dark", "Dark"], ["contrast", "High contrast"]] as const).map(([v, label]) => <button key={v} type="button" aria-pressed={prefs.bg === v} onClick={() => savePrefs({ bg: v })} className={clsx("rounded-md border px-3 py-2", prefs.bg === v ? "border-accent bg-accent-soft" : "border-border-strong")}>{label}</button>)}</div></fieldset>
          {([["size", "Text size", 14, 32, 1, (v: number) => `${v}px`], ["letter", "Letter spacing", 0, 0.2, 0.01, (v: number) => `${v.toFixed(2)}em`], ["word", "Word spacing", 0, 0.8, 0.05, (v: number) => `${v.toFixed(2)}em`], ["line", "Line spacing", 1.2, 2.2, 0.1, (v: number) => v.toFixed(1)], ["width", "Line width", 35, 90, 5, (v: number) => `${v} characters`]] as const).map(([key, label, min, max, step, fmt]) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="flex justify-between font-bold"><span>{label}</span><span className="text-ink-muted">{fmt(prefs[key])}</span></span>
              <input type="range" min={min} max={max} step={step} value={prefs[key]} onChange={(e) => savePrefs({ [key]: Number(e.target.value) } as Partial<Prefs>)} className="h-11 accent-[var(--color-accent)]" />
            </label>
          ))}
          <label className="flex items-center justify-between font-bold"><span>Reading ruler</span><input type="checkbox" checked={prefs.ruler} onChange={(e) => savePrefs({ ruler: e.target.checked })} className="h-6 w-6 accent-[var(--color-accent)]" /></label>
          <button type="button" className="self-start text-sm text-ink-muted underline-offset-4 hover:underline" onClick={() => savePrefs(DEFAULT_PREFS)}>Reset to defaults</button>
        </div>
      </Sheet>
    </div>
  );
}
