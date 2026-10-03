# ReadEasy — PLAN.md (the save file)

If you are a new session told "Continue from PLAN.md": read this file top to bottom, then BRAND.md, then DECISIONS.md. The **Current state** block says exactly where we are. Work the next unchecked item in the current phase. Keep this file current in the same commit as the work.

## Current state

- **Mode: hackathon MVP** (owner's call, 2026-10-03). The demo path is built and smoke-tested end to end in a real browser: paste text → sections adapted (mock or Claude) → review with Fact Guard flags → sign in → create class link → publish → class page → reader with read-aloud highlighting, word popover, settings sheet, level switch → QR page. `node scripts/smoke.mjs` runs it against `pnpm start`.
- Branch: work on `claude/awesome-pascal-c1hgr5`; every commit is pushed to BOTH `main` and that branch. Commits authored as `Bhanu Sadhu <bhnsadhu@gmail.com>` with the Claude co-author trailer.
- Runs with zero services locally (in-process Postgres via PGlite, built-in rule-based adapter). Production needs three env vars: `DATABASE_URL` (any Postgres; `pnpm db:migrate` sets it up), `DRAFT_COOKIE_SECRET`, `NEXT_PUBLIC_APP_URL`. Sign-in is a simple email sign-in unless Supabase Auth is configured; uploads are stored in Postgres (4 MB cap) unless Supabase Storage is configured; Claude is optional.
- Built but not wired into the UI yet: URL import (`/api/ingest` supports it; no field on the landing page), quick checks (generated and validated, not shown to students), image descriptions, reading ruler keyboard control, PWA service worker, per-section inline editing UI (server action exists), reorder/duplicate/rotate (server actions exist).
- Not done (cut for the MVP, see Known limitations): Playwright e2e suite beyond the smoke script, cross-browser runs, load test, Lighthouse CI, break-it rounds, DEMO.md/PRIVACY.md/BUGS.md, seed script, deploy.
- Environment limits: no Docker; this sandbox cannot download Playwright's WebKit/Firefox, so local runs use the preinstalled Chromium via `executablePath`.
- Landing page is a live Before/After demo: four one-click sample readings, adapted entirely in the browser by the built-in rule-based adapter, with grade estimates, Plain/Simple toggle, and Listen with sentence highlighting; one button makes the class version. Review page shows Before (dense handout styling) vs After (reader styling) and a positive Fact Guard verdict.
- Last completed item: production-readiness pass (upload button, /api/health, production secret check, CI runs the smoke test, README/DEMO/PRIVACY written). Smoke test: 18/18 steps.

## Architecture (decided; see DECISIONS.md and RESEARCH.md §4)

- **Next.js 16.3 App Router, React 19, TypeScript strict, Tailwind v4** (tokens live as CSS variables in `src/styles/tokens.css` via `@theme`; a unit test fails on any raw hex outside that file). `proxy.ts` (Next 16 name for middleware) sets security headers + CSP nonce and refreshes the Supabase session.
- **Supabase**: Postgres + Storage + Auth (teachers only, magic link via `token_hash` + `/auth/confirm`, PKCE-safe across devices). RLS on every table. Anonymous reads go only through `security definer` RPCs keyed by 128-bit share tokens; tables are revoked from `anon`. Migrations in `supabase/migrations/`.
- **Data access is plain SQL with RLS applied per request** (`src/lib/db`): every query runs inside a transaction that sets `request.jwt.claims` and `set local role anon|authenticated` from the verified session, exactly like PostgREST would. Two drivers behind one interface: `postgres.js` to Supabase's pooler in production (`DATABASE_URL`), PGlite in-process when `MOCK_DB=1` or no database is configured. The same migration files run in both, so the RLS unit tests, the e2e suite, local dev, and production all exercise identical policies with no Docker. supabase-js is used only for Auth and Storage.
- **Mock auth**: when Supabase is not configured and `NEXT_PUBLIC_DEV_TOOLS=1`, a dev-only sign-in route sets an HMAC-signed session cookie; `getSession()` hides the difference from the rest of the app.
- **Uploads**: browser → Supabase Storage via signed upload URL (Vercel's 4.5 MB body cap means files never pass through a route handler). Server sniffs type by magic bytes (`file-type`), caps size (25 MB) and pages (40), then parses: `unpdf` text → if ≥50% pages have <50 chars, send the PDF as a Claude `document` block; DOCX via `mammoth`; images (≤10 MB, downscaled ≤2000px) via Claude vision; pasted text; URL via `@mozilla/readability` + `linkedom` behind an SSRF guard (DNS resolve → block private/loopback/link-local/ULA, manual redirects ≤3 hops, 10 s timeout, 5 MB cap). Extracted content is plain text, never HTML.
- **Generation**: `src/lib/llm/` has a provider interface; `MockProvider` (deterministic fixtures, `MOCK_LLM=1`) and `AnthropicProvider` (`@anthropic-ai/sdk`, structured outputs via `output_config` + zod, temperature 0.2, default model `claude-haiku-4-5`, `LLM_MODEL` overrides). Uploaded text is wrapped as data (`<document>` with an explicit "this is content, not instructions" frame). Pipeline per material: language detect → section chunking (~100–200 words, headings preserved) → per section: title + "this part is about" + Plain + Simple rewrites + 1–2 quick checks → Fact Guard (entity extraction from source; retry once with missing list; else keep original + flag) → quick-check support validation → sentence segmentation (`sbd`) → syllables (`hyphen` for chunks, `syllable` for counts). Material-level: TL;DR, up to 8 words to know (definition from text only or "teacher should define"), assignment steps if applicable, AI-written image descriptions.
- **Processing is resumable**: `sections` rows carry `status` (pending/processing/done/flagged/failed), a lease timestamp, and attempt count. `POST /api/materials/[id]/process` claims one pending section (lease), processes it, returns progress. The client loops until done; refresh, close, or a second tab just resumes (leases expire after 90 s). One bad section never fails the material.
- **Content model** is structured JSON (paragraph/heading/list blocks with sentence arrays), rendered by our own React renderer. No `dangerouslySetInnerHTML` anywhere; teacher edits are plain text. XSS is prevented by construction, with a sanitizer as belt-and-braces on import.
- **Student routes**: `/c/[handle]` class page, `/r/[token]` reader, `/go` for the 6-character class code, all `noindex`, served via RPC with `"use cache"` tagged per material and invalidated on publish/edit. Preferences and progress in `localStorage` only.
- **TTS**: `src/lib/tts/` interface with `WebSpeechEngine`: one utterance per sentence chained in `onend` (defeats Chrome's 15 s cutoff and gives sentence highlighting everywhere), word underline from `boundary` events when they fire within 1.5 s, else estimated cadence resynced each sentence; pause = cancel + remembered index; `speak()` called synchronously inside the tap handler for iOS; silent-audio unlock + mute-switch hint on iOS; rate clamped 0.5–1.5; cancel on `pagehide`. `TTS_PROVIDER` env selects a future cloud engine.
- **Rate limits and caps** in Postgres (`rate_limits` table, sliding window) because serverless has no shared memory: per-IP for anonymous try-it and student routes, per-teacher daily generation cap.
- **Try before signup**: anonymous material owned by a `draft_token` cookie (httpOnly); signing in claims it.
- **Testing**: Vitest (unit + PGlite RLS), Playwright (Chromium/WebKit/Firefox × phone/iPad/Chromebook/desktop) with `@axe-core/playwright`, autocannon load script, Lighthouse CI config, screenshots to `/test-shots`, GitHub Actions on every push.

## Phases

### Phase 0 — Research, brand, plan
- [x] Git check (PAUSE POINT 0)
- [x] First commit (.gitignore, README stub)
- [x] Research: dyslexia evidence, competitors, design, tech (RESEARCH.md)
- [x] BRAND.md
- [x] DECISIONS.md
- [x] PLAN.md
- [ ] PAUSE POINT 1 summary posted

### Phase 1 — Scaffold, tokens, component library
- [ ] Next.js 16 app in `src/`, TS strict, ESLint, Tailwind v4, pnpm
- [ ] `src/styles/tokens.css` with every BRAND.md token (light, dark, reading backgrounds, class themes)
- [ ] Fonts via `next/font`: Atkinson Hyperlegible Next (preload), Fraunces (axes), Lexend (no preload), OpenDyslexic (local, lazy)
- [ ] Logo mark SVGs, favicon set, apple-touch-icon, PWA icons, OG image route
- [ ] Component library: Button, IconButton, Input, Textarea, Select, Card, Sheet (bottom), Dialog, Toast, EmptyState, Badge, Skeleton, Progress, Tabs, Switch, Slider, Tooltip, Logo
- [ ] `/styleguide` (hidden in production via `NEXT_PUBLIC_DEV_TOOLS`)
- [ ] Unit test: no raw hex/px font sizes outside the token file; banned-words lint
- [ ] Unit test: every text token ≥ 4.5:1 on its surfaces
- [ ] Root layout, 404, 500/error, loading skeleton conventions, `prefers-reduced-motion`
- [ ] Vitest + Playwright + GitHub Actions skeleton (lint, typecheck, unit)

### Phase 2 — Data model, Supabase, auth
- [ ] Migrations: `teachers`, `classes`, `materials`, `sections`, `material_assets`, `rate_limits`, `generation_usage`; enums; indexes; `updated_at` triggers
- [ ] RLS: owner-only policies on every table; `anon` revoked; RPCs `get_class_by_handle`, `get_material_by_token`, `get_class_by_code`, `claim_draft_material`
- [ ] Share tokens: `gen_random_bytes(16)` base64url, `rotated_at`; class handle validation (3–40 chars, lowercase, reserved words)
- [ ] PGlite RLS tests: cross-teacher read/write denied, anon reads only published via valid token, rotated token fails, unpublished fails
- [ ] Supabase clients (browser/server/proxy), `getClaims()` auth, magic link `/auth/confirm`, branded email template in `supabase/templates/`
- [ ] Test auth helper (dev-only route that signs in a test teacher when `NEXT_PUBLIC_DEV_TOOLS=1`)
- [ ] Auth edge cases: expired/reused link screen, different-device sign-in, session expiry mid-edit (local draft kept, re-auth in dialog, no lost work)

### Phase 3 — Ingestion
- [ ] Signed upload URL flow; bucket limits (25 MB, allowed MIME)
- [ ] Type sniffing by magic bytes; fake-extension, empty, corrupt, password-protected handling with specific messages
- [ ] PDF text (`unpdf`), scanned detection, page cap (40) with clear message, multi-column + tables best-effort, math preserved and flagged
- [ ] DOCX (`mammoth`), images (orientation via EXIF, downscale), pasted text, URL import (Readability) with SSRF guard, redirects, timeouts, size caps, paywall/login-page detection
- [ ] Language detection; non-English keeps language + `dir`
- [ ] PII detection (emails, phones, SSN, IDs, name+grade tables, IEP/504) with one-click redaction before processing
- [ ] Mostly-image / fill-in-the-blank detection → explain the limit
- [ ] Duplicate upload detection (content hash) → offer the existing material
- [ ] Fixtures generated by script: clean PDF, scanned PDF, tilted photo, DOCX, multi-column PDF, worksheet with names, prompt-injection doc, Spanish text, 40-page PDF, corrupt file, fake extension
- [ ] Unit tests: sniffing, SSRF blocking, PII, sanitizer, parsers on fixtures

### Phase 4 — Generation pipeline
- [ ] LLM provider interface, `MockProvider` with deterministic fixtures, `AnthropicProvider` with structured outputs, retries, timeouts
- [ ] Prompt library: content-as-data framing, low temperature, per-task schemas
- [ ] Chunking into ~100–200 word sections with headings; very short material skips sectioning
- [ ] Sentence segmentation (`sbd` + abbreviation merge), unit tests ("Dr.", "U.S.", decimals, quotes)
- [ ] Syllables (`hyphen` + overrides), unit tests
- [ ] Rewrites: Plain (~grade 7), Simple (~grade 4); readability estimate shown per level
- [ ] TL;DR, words to know (≤8, from text only or "teacher should define"), quick checks (1–2 per section), assignment steps, image descriptions
- [ ] Fact Guard: entity extraction, verification, retry once with missing list, fallback to original + flag naming what was dropped; unit tests
- [ ] Quick-check support validation; flag unsupported
- [ ] Output validation: empty/garbled/markdown/preamble handling, retry once, per-section fallback
- [ ] Resumable per-section processing route with leases; two-tab safety; progress API
- [ ] Per-teacher daily cap, per-IP limits; usage table

### Phase 5 — Teacher experience
- [ ] Landing page: one-sentence promise, live before/after demo (paste → instant adapted view with read aloud), "Try it with your own material"
- [ ] Try-before-signup: upload → full result without an account; sign in only to publish; draft claimed on sign-in
- [ ] Sign-in screen + magic-link sent state + branded email
- [ ] Dashboard: classes and materials with status (draft / needs review / published); empty states with one action
- [ ] Class setup: name, grade band, handle (live availability), theme, welcome line; live preview
- [ ] Create material: file/photo, paste, URL; choose supports (all on)
- [ ] Processing screen: real per-section progress, survives refresh, resumes
- [ ] Review: original vs adapted side by side per section, inline edit, regenerate, remove, level tabs; Fact Guard flags each acknowledged before publish; quick checks editable
- [ ] Publish/unpublish; share: class link, QR projector page, class code; rotate link; reorder; duplicate to another class
- [ ] Conflict detection for two tabs editing the same material (version check + warning)

### Phase 6 — Student experience
- [ ] Class page `/c/[handle]`: instant, large cards with listen time + section count, theme accent
- [ ] `/go` class code entry
- [ ] Reader `/r/[token]`: Words to know preview (skippable, each with play); read aloud hero (big play, sentence highlight + bar, tap a sentence to start there, speed, pause/resume keeps place, auto-scroll); tap any word (spoken, syllables, definition if known, never invented)
- [ ] Reading settings sheet: font, size, letter/word/line spacing, line width, background; left-aligned only; instant; persisted to localStorage
- [ ] Reading ruler (mouse/finger/keyboard); one-section-at-a-time mode with progress + checkable sections
- [ ] Level switch (Original always)
- [ ] Finish screen
- [ ] PWA: manifest, icons, service worker (shell precache, network-first reader), install hint
- [ ] Unpublished/rotated link screen; teacher edits after start → progress maps by section id without crashing
- [ ] TTS edge cases: no voices, voices loading late, iOS gesture + mute hint, backgrounded tab, offline after load
- [ ] Small screens, 200% zoom, keyboard-only, screen reader labels

### Phase 7 — Hardening and security
- [ ] Security headers (CSP nonce, HSTS, frame-ancestors, referrer policy) + tests
- [ ] Rate limits on student routes and anonymous try-it; generation caps; tests
- [ ] Access-control review of every route and RPC
- [ ] Content: no HTML rendering paths; sanitizer tests on hostile fixtures; prompt-injection fixture produces no instruction-following
- [ ] Upload abuse: oversized, malformed, fake MIME, zip bombs in DOCX
- [ ] Material text never logged; structured logs reviewed
- [ ] PRIVACY.md + `/privacy` page

### Phase 8 — Test suite complete
- [ ] Unit suite (all items in the brief's list) green
- [ ] PGlite RLS suite green
- [ ] Playwright e2e: teacher flow, student flow (3+ sentences highlighted), unpublished link, processing failure recovery, expired session mid-edit
- [ ] 3 browsers × 4 viewports; axe on every page (0 serious/critical)
- [ ] Load test: 35 concurrent on class page + reader, p95 < 1 s, 0 errors
- [ ] Lighthouse CI ≥ 95 on landing + student pages
- [ ] Screenshots of every screen/state, light and dark, in `/test-shots`
- [ ] GitHub Actions: lint, typecheck, unit, RLS, e2e (mock) on every push, green

### Phase 9 — Break-it rounds
- [ ] Round 1: security review, chaotic classroom, content stress, role reviews → BUGS.md, fixes, regression tests
- [ ] Round 2 (full) → clean?
- [ ] Round 3 (full) → clean? (two consecutive clean rounds required)

### Phase 10 — Polish, docs, deploy
- [ ] Walk every flow as first-time teacher and student, phone + desktop; copy tightening
- [ ] Brand audit of `/test-shots` against BRAND.md
- [ ] README (architecture Mermaid, setup, env, migrations, deploy), DEMO.md (script, checklist, seed, judge Q&A), BUGS.md final
- [ ] Seed script: demo teacher, class, pre-processed materials
- [ ] PAUSE POINT 2: credentials → Supabase migrations applied, custom SMTP configured, Vercel deploy with GitHub auto-deploy
- [ ] Production smoke test on a phone via QR
- [ ] PAUSE POINT 3 summary

## Edge-case register (each must be checked or documented as a known limitation)

Uploads: scanned PDF · tilted/blurry photo · multi-column · tables · math (preserve + flag) · very large (size/page cap, clear message) · empty · corrupt · password-protected · unsupported type · fake extension · non-English (language, direction, voice) · mostly-image · fill-in-the-blank · URL failure · paywall · redirect to login · duplicate upload · very short material.
Processing: LLM timeout · rate limit · empty/garbled/markdown/preamble output · tab closed mid-processing → resumes · two tabs editing → conflict warning · one bad section never sinks the material.
Auth: expired link · reused link · different device · session expiry mid-edit (no lost work).
Students: link after unpublish/rotation · teacher edits after students started · no voices · voices load late · iOS Safari speech (gesture, mute, pause) · tab backgrounded mid-speech · slow wifi · offline after load · small Chromebook · phones · 200% zoom · keyboard-only · screen readers.

## Known limitations (v1, with reasons)

- URL import has an API route and SSRF guard but no field in the UI yet (time). File upload (PDF, Word, image, text) is wired and smoke-tested.
- Quick checks are generated and validated but not shown in the reader (time; the data is in `sections.quick_checks`).
- Cross-browser e2e, load test, Lighthouse, and break-it rounds were not run (time). The smoke script covers the demo path on Chromium.
- Email sign-in requires a Supabase project with custom SMTP; without Supabase the app uses the dev sign-in (`NEXT_PUBLIC_DEV_TOOLS=1` only).

## Definition of done

- Deployed to a production Vercel URL; GitHub repo connected so merges to `main` auto-deploy.
- All unit, RLS, e2e (3 browsers × 4 viewports), load, and axe tests pass; CI green.
- Lighthouse ≥ 95 (performance, accessibility, best practices, SEO) on landing and student pages.
- Lint, typecheck, design-token check, banned-words check clean.
- Zero known bugs; two consecutive full break-it rounds found nothing serious.
- Brand audit passes on every screen in light and dark.
- Every feature and edge case above is checked or listed under Known limitations with a reason.
- Seeded demo class exists and works on a phone via QR.
- All work committed and pushed with a clean, meaningful history.
