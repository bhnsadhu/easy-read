# ReadEasy brand system

Owner: Brand and Design Lead. Every screen, email, icon, and error page is held to this file. Research behind each choice is in RESEARCH.md §3; decisions are logged in DECISIONS.md.

## 1. Brand idea

**Every reading, ready for every reader.**

A teacher uploads what they already assign. ReadEasy makes it readable, listenable, and understandable, and gives the class one link. The product's job is to disappear: the teacher looks organized, the student just reads.

Three words we design toward: **calm, capable, kind.**

## 2. Name treatment and wordmark

- The name is `ReadEasy`: one word, capital R and E, never "Read Easy", "READEASY", or "readeasy" in prose. The handle/domain form `readeasy` is fine in URLs only.
- Wordmark: `ReadEasy` set in Fraunces, weight 600, optical size 72, SOFT 50, WONK 0, letter-spacing -0.01em, in Ink. Nothing is colored inside the wordmark; the mark carries the color.
- Lockup: mark + 8px gap + wordmark, baseline-aligned. Minimum lockup height 24px. Below that, mark only.
- Clear space: the height of the mark on all sides.

## 3. Logo mark: "the lit line"

A rounded square (radius 22% of width) in Teal. Inside, three left-aligned horizontal bars representing lines of text; the middle bar is drawn as a highlighter stroke in Highlight yellow, slightly longer and thicker than the other two, which are Cream.

Why: it is literally the product's hero moment (one sentence lit up while it is read aloud). It reads at 16px as "text with one glowing line", and on a projector the single yellow bar is unmistakable.

Files (see `public/brand/`):
- `mark.svg` full color (teal tile, cream bars, yellow stroke)
- `mark-mono.svg` single color: middle bar filled, outer bars outlined
- `favicon.svg`, `favicon.ico`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `og-image.png` are all generated from the mark; never hand-drawn variants.

Rules: never rotate, never add a drop shadow, never set the mark on the yellow, never put text inside the tile.

## 4. Palette

All colors live in `src/styles/tokens.css` as CSS variables and nowhere else. A test (`tests/unit/design-tokens.test.ts`) fails the build if a raw hex appears outside the token file.

Contrast ratios below were computed with the WCAG 2.x formula (`scripts/contrast.mjs`). Text tokens must be ≥ 4.5:1 on every surface they are used on; the token test asserts it.

### Light (default) and reading surfaces

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--surface` | `#FBF7EF` | Page background, cream. Never pure white. | — |
| `--surface-raised` | `#FFFCF5` | Cards, sheets, inputs | ink 14.6:1 |
| `--surface-sunken` | `#F3EDE1` | Wells, table headers, code | — |
| `--border` | `#E6DFD2` | Hairlines, dividers | — |
| `--border-strong` | `#CFC6B5` | Input borders, focus-adjacent | — |
| `--ink` | `#2B2620` | Body text. Never pure black. | 14.0:1 on cream |
| `--ink-muted` | `#5F574D` | Secondary text, labels | 6.65:1 |
| `--ink-faint` | `#746B60` | Placeholders, timestamps | ≥4.5:1 (asserted) |
| `--accent` | `#0E6F63` | Teal. Primary buttons, links, active states, the mark | 5.66:1 on cream; white on it 6.05:1 |
| `--accent-strong` | `#0B5F55` | Hover/pressed, small link text | 7.06:1 |
| `--accent-soft` | `#DCEFEB` | Selected rows, chips, info banners | teal text on it 5.07:1 |
| `--highlight` | `#FFE66D` | **Reserved**: the sentence being read aloud. Nothing else. | ink on it 12.0:1 |
| `--highlight-bar` | `#8C6D0B` | 3px left bar / underline paired with `--highlight` so the spoken sentence survives grayscale and low vision (yellow vs cream is only 1.17:1) | 4.56:1 |
| `--success` | `#1F6B3A` | Published, saved, passed | 6.10:1 |
| `--success-soft` | `#E1F0E4` | Success banners | success text 5.52:1 |
| `--warning` | `#8A5A00` | Needs review, fact-guard flag | 5.55:1 |
| `--warning-soft` | `#FFF1CC` | Flag banners | warning text 5.28:1 |
| `--danger` | `#B3261E` | Destructive actions, errors | 6.12:1; white on it 6.54:1 |
| `--danger-soft` | `#FBE3E0` | Error banners | danger text 5.34:1 |

Student reading backgrounds (student picks; ink stays `--ink` except on dark/high-contrast):

| Name | Surface | Text | Ratio |
|---|---|---|---|
| Cream (default) | `#FBF7EF` | `#2B2620` | 14.0:1 |
| Pale blue | `#EAF1F8` | `#2B2620` | 13.2:1 |
| Soft green | `#ECF3E8` | `#2B2620` | 13.2:1 |
| Dark | `#1B1A18` | `#ECE6DA` | 14.0:1 |
| High contrast | `#000000` | `#FFFFFF` | 21:1 |

On Dark, the highlight becomes `#5C4A0A` (text on it 6.93:1) with bar `#FFE66D`. On High contrast, the highlight is `#FFE66D` with `#000000` text (16.8:1).

### Dark mode (teacher side follows system; student side is an explicit background choice)

| Token | Hex |
|---|---|
| `--surface` | `#1B1A18` |
| `--surface-raised` | `#262421` |
| `--surface-sunken` | `#141311` |
| `--border` | `#3A3631` |
| `--border-strong` | `#4E4942` |
| `--ink` | `#ECE6DA` (14.0:1) |
| `--ink-muted` | `#B5AC9E` (7.75:1) |
| `--ink-faint` | `#948B7E` |
| `--accent` | `#3FBFAD` (7.67:1; ink `#1B1A18` on it 7.67:1) |
| `--accent-strong` | `#6AD3C3` |
| `--accent-soft` | `#163B36` |
| `--highlight` | `#5C4A0A` |
| `--highlight-bar` | `#FFE66D` |
| `--success` / `--warning` / `--danger` | `#7BD389` / `#FFC857` / `#FF8A80` (all ≥7.6:1) |

### Class themes

A teacher picks one accent for their class page from six, all ≥5.9:1 on cream with white labels ≥6.3:1: Teal `#0E6F63` (default), Plum `#6A3FA3`, Rust `#9E3A14`, Indigo `#3B4BCB`, Forest `#2F6B3A`, Berry `#A3265E`. The theme sets `--accent`, `--accent-strong`, and `--accent-soft` on the class page and its reader only. Highlight yellow never changes.

Rules: no gradients as decoration (a gradient may appear only inside the OG image background). No red/green pairs carrying meaning on their own; status always has an icon or word.

## 5. Type

Two faces, loaded with `next/font` (self-hosted, zero layout shift via size-adjusted fallbacks):

- **Atkinson Hyperlegible Next** (variable 200–800): all UI, all student screens, default reading face.
- **Fraunces** (variable; axes opsz, SOFT, WONK): landing page and teacher-side headlines ≥ 28px only. Setting: `wght 600, opsz 72, SOFT 50, WONK 0`. Never on the student side, never below 28px, never for body copy.

Student reading-face choices (preferences, never claims): Atkinson Hyperlegible Next (default), Lexend (variable, `preload: false`), OpenDyslexic Regular + Bold (`next/font/local`, lazy). Switching sets `data-font` on the reader root.

Type scale (rem, base 16px). Line-height in the second column.

| Token | Size / LH | Use |
|---|---|---|
| `--text-xs` | 12 / 16 | Badges, captions (never below this) |
| `--text-sm` | 14 / 20 | Secondary UI, table cells |
| `--text-base` | 16 / 24 | UI body |
| `--text-lg` | 18 / 28 | Lead paragraphs, student UI body |
| `--text-xl` | 20 / 28 | Card titles |
| `--text-2xl` | 24 / 32 | Section headings (Atkinson 700) |
| `--text-3xl` | 30 / 36 | Page titles, teacher (Fraunces) |
| `--text-4xl` | 36 / 40 | Landing section heads (Fraunces) |
| `--text-5xl` | 48 / 52 | Landing hero (Fraunces) |
| `--text-6xl` | 60 / 64 | Landing hero desktop (Fraunces) |

Reading view defaults (student, from RESEARCH.md §1): 18px (20px for grade band 3–5), line-height 1.5, letter-spacing 0.05em, word-spacing 0.20em, paragraph gap 2em, max width 65ch, left-aligned, no hyphenation. Headings in the reader are 1.25× body, bold. No italics, no underline for emphasis, no all-caps anywhere in the reader (including buttons), never justified.

Rules everywhere: sentence case for all headings, buttons, and labels. Bold is the only emphasis. Numbers use tabular figures in tables.

## 6. Spacing

4px base. Tokens `--space-1` … `--space-24`: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96. Page gutters: 16px phone, 24px tablet, 32px desktop. Content max widths: teacher pages 1120px; reading column 65ch; forms 480px. Touch targets ≥ 44×44px on student screens, ≥ 36px on teacher screens.

## 7. Radius and borders

`--radius-sm` 6px (badges, inputs), `--radius-md` 10px (buttons, chips), `--radius-lg` 14px (cards), `--radius-xl` 20px (sheets, modals, material cards on the class page), `--radius-full` for pills and the play button. Borders are 1px `--border`; cards have a border, never a shadow, except floating sheets and popovers which get `--shadow-float: 0 8px 24px rgb(43 38 32 / 0.12)`. Focus ring: 2px solid `--accent`, 2px offset, on every interactive element, visible on keyboard focus only (`:focus-visible`).

## 8. Iconography

Lucide icons, 1.75px stroke, 20px in teacher UI, 24px in student UI. Icons never appear without a label except the play/pause button and the close button. No emoji in UI. No filled icons except the play button and the mark.

## 9. Motion

Motion confirms an action or shows what changed. It never decorates.

- `--duration-fast` 120ms: hover, press, toggle
- `--duration-base` 180ms: confirmations (publish, save), toasts in
- `--duration-slow` 240ms: bottom sheets, modals
- `--ease` `cubic-bezier(0.2, 0, 0, 1)`, entering and exiting elements use ease-out
- Spoken-sentence highlight changes instantly (0ms) so it never lags the voice. Auto-scroll uses `scrollIntoView({ block: 'center', behavior: 'smooth' })`, and `behavior: 'auto'` under reduced motion.
- `prefers-reduced-motion: reduce`: durations drop to 100ms and transforms become opacity-only. Nothing is removed that conveys state.
- Skeletons shimmer only when motion is allowed; otherwise they are static.
- One "wow" moment is allowed: the first time an adapted material appears for a teacher, sections fade and rise in with a 40ms stagger. Never again on that session.

## 10. Voice and tone

Teacher side sounds like a sharp colleague: plain verbs, short sentences, says what happened and what to do next. Student side sounds like a calm coach: warm, direct, no exclamation points, never babyish.

One name per action, everywhere: **Upload**, **Review**, **Publish**, **Unpublish**, **Share**, **Rotate link**, **Duplicate**, **Regenerate**, **Remove section**, **Listen**, **Words to know**, **Reading settings**, **Reading ruler**, **One section at a time**, **Level**. Level names: **Original**, **Plain**, **Simple**.

| Do | Don't |
|---|---|
| "Upload a reading. Share one link. Every student can read it." | "Empowering struggling readers with cutting-edge AI!" |
| "We couldn't read that PDF. Try a clearer photo, or paste the text." | "Error: extraction failed (code 422)." |
| "2 facts were dropped in this section. Check them before you publish." | "⚠️ WARNING: hallucination detected" |
| "Words to know" | "Vocabulary for struggling readers" |
| "Reading settings" | "Dyslexia mode" |
| "Nice work. That's the whole reading." | "🎉 Great job, superstar!!!" |
| "Ask your teacher for the new link." | "404 Not Found" |
| "Sign in to publish. We'll email you a link." | "Authentication required." |

Banned words in any UI, email, or marketing copy: struggling, low readers, remedial, deficit, disabled readers, dyslexia mode, fix, cure, treatment, hallucination, AI-powered. A lint test greps the `src/` and `emails/` trees for them.

Errors always have three parts: what happened, why if we know, what to do next. Empty states always have one action.

## 11. Imagery

No stock photos, no illustrations of people, no mascots. The hero image is the product itself: real adapted text with a sentence lit. Abstract highlighter strokes in `--highlight` are the only decorative element, used at most once per page. Screenshots in marketing are real screenshots.

## 12. Two moods, one system

| | Teacher side | Student side |
|---|---|---|
| Headlines | Fraunces | Atkinson 700 |
| Density | Compact tables, 36px targets | Generous, 44px targets, one thing per screen |
| Color | Teal accent, status colors visible | Class theme accent, highlight yellow, almost no status color |
| Motion | Confirmations | Only playback feedback |
| Copy | Sharp colleague | Calm coach |
| Dark mode | Follows system | Explicit background choice |

Both share tokens, components, radius, icons, and the mark. If a screenshot of the student reader and the teacher dashboard sat side by side, they should look like siblings, not strangers.
