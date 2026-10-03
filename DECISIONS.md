# Decisions log

Format: decision, role, one-line reason, research it rests on. Newest at the bottom.

| # | Decision | Role | Reason | Rests on |
|---|---|---|---|---|
| 1 | Push every commit to `claude/awesome-pascal-c1hgr5`; `main` updates via merge on GitHub | Staff Eng | The build session is locked to that branch; main stays green and human-merged | Session constraint |
| 2 | Fonts are preferences, never marketed as treatment; Atkinson Hyperlegible Next is the default reading face | Dyslexia Specialist | Controlled studies show no gain from OpenDyslexic/Dyslexie; Lexend's claim is one in-house study; Atkinson is a clean humanist sans with no counter-evidence | RESEARCH.md §1.5 |
| 3 | Reading defaults: 18px (20px grades 3–5), line-height 1.5, letter-spacing 0.05em, word-spacing 0.20em, 65ch, left-aligned | Dyslexia Specialist | BDA 2023 + WCAG 1.4.12 give the numbers; Zorzi/Galliussi say word spacing must scale with letter spacing | RESEARCH.md §1.1–1.4 |
| 4 | Background tints are comfort settings; copy never implies they treat anything | Dyslexia Specialist | Griffiths 2016: overlays indistinguishable from placebo; Rello & Bigham: warm backgrounds are a mild preference | RESEARCH.md §1.6 |
| 5 | Read-aloud default 150 wpm with grade presets 130/145/160; quick presets cap at 180 | Dyslexia Specialist | Cunningham: 140–180 wpm productive; students left alone go too fast | RESEARCH.md §1.7 |
| 6 | Highlight the current sentence (soft tint + left bar); current word gets a subtle underline when boundary events exist | Dyslexia Specialist + Design | Keelor 2023: any highlight fine, none proven better; sentence tint is calmer than word flashing | RESEARCH.md §1.7 |
| 7 | Word help is on demand (tap), never silent auto-replacement; Original is always one tap away | Dyslexia Specialist | Rello 2013 "Simplify or Help": users prefer help over replacement; sentence-level rewrites break cohesion | RESEARCH.md §1.10 |
| 8 | Same "Reading settings" for every student; no "dyslexia mode", no deficit labels anywhere | Dyslexia Specialist + Education Lead | UDL 3.0; students conceal dyslexia and reject visible accommodations in secondary school | RESEARCH.md §1.12 |
| 9 | Level names: Original, Plain, Simple (internal keys original/medium/simple) | Education Lead | Names describe the text, not the reader | DECISIONS 8 |
| 10 | Display face: Fraunces (wght 600, opsz 72, SOFT 50) on teacher side and landing only; student side is all Atkinson | Design Lead | Serif-vs-sans hierarchy without a second sans; one 65 KB variable file; soft axis reads warm not twee | RESEARCH.md §3.2 |
| 11 | Palette: cream #FBF7EF, ink #2B2620, teal #0E6F63, highlight #FFE66D + bar #8C6D0B | Design Lead | Computed contrast: ink 14:1, teal 5.66:1 (AA), highlight is hue-only vs cream so a 4.56:1 bar is paired for grayscale/low vision | BRAND.md §4 |
| 12 | Six class themes, all ≥5.9:1 on cream; highlight yellow never changes with theme | Design Lead | Theme must not break AA or the spoken-sentence convention | BRAND.md §4 |
| 13 | Mark: "the lit line" (teal tile, three bars, middle one a yellow highlighter stroke) | Design Lead | Encodes the hero feature; legible at 16px and on a projector | BRAND.md §3 |
| 14 | Fact Guard is the headline trust feature, surfaced in review and in the judge Q&A | Head of Product | EdWeek 2026: six LLMs incl. Diffit leveled too high and drifted meaning; no competitor verifies rewrites of the teacher's own upload | RESEARCH.md §2 |
| 15 | Students see no AI, no chat, no accounts: only teacher-approved artifacts | Security Lead + Head of Product | MagicStudent collects names and sits in a Common Sense "Moderate Risk" category; zero student data is the procurement story | RESEARCH.md §2 |
| 16 | Try-before-signup: the first upload is the onboarding; sign-in only to publish | Head of Product | Duolingo lesson-before-signup and Beacons "claim the link first" patterns; Diffit's gap is the hand-off after export | RESEARCH.md §2.5, §3.1 |
| 17 | RLS tests run on PGlite (Postgres in WASM) so CI needs no Docker or external services | Staff Eng | No Docker daemon in the build environment; PGlite runs real policies | RESEARCH.md §4 |
