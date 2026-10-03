# ReadEasy — launch video plan

**What it is:** Paste any class reading; ReadEasy turns it into short sections, plain sentences, and big spaced text that reads itself aloud, then gives the class one link.
**For:** Teachers, and every student in the room (one in five can't get through the handout as written). Students never log in.
**Sets it apart:** Read-aloud with the spoken sentence lit up; students pick font, size, background; Fact Guard checks every number, date, and name survived the rewrite.
**Most impressive claim (real, computed by the app):** the lab handout drops from ≈ grade 12.6 to ≈ grade 4.7.
**Visual hook:** a wall of tiny justified Times New Roman with a red "reads at ≈ grade 12.6" badge.
**Real UI shown:** the landing demo's Before/After card, Listen with sentence highlight (reader markup + real CSS), reading settings chips + `data-reading-bg` themes, review-page Fact Guard banner, the mark/wordmark.
**Tone:** `default`, bent toward the brand's "calm, capable, kind": punchy cuts, soft motion, no exclamation points.
**Share caption:** see `share-copy.txt`.

## Angle
The handout every class already gets, before and after. The yellow highlighter stroke from the logo ("the lit line") does the reveal, then becomes the read-aloud highlight.

## Material (all real)
- Before/After text: `SAMPLES.assignment` ("Lab: measuring the speed of a toy car"), section 2, Simple level, produced by `simplifyContent` (the built-in adapter). Grades from `estimateReadability` over the whole handout: 12.6 → 4.7.
- Fact Guard: `SAMPLES.news`; `verifyFacts` finds nothing missing, so every chip is a true check.
- Copy is lifted from the site/README: "Dense readings, made readable.", "Paste it, share one link, done.", "Students never log in.", review banner wording.
- Note: other samples' rewrites contain grammar errors (e.g. a literal "$1"), so they are deliberately not shown.

## Storyboard — 22.0s, 1920×1080, 30fps, 120 bpm half-time (bar = 2s)
| # | Time | Scene | On screen | Sound |
|---|---|---|---|---|
| 1 | 0.0–3.0 | Hook | Dense handout fills the right side, red grade 12.6 badge pops. Left, Fraunces: "One in five students can't get through this." | Low muted pad on Bm, soft ticking hat |
| 2 | 3.0–7.0 | Reveal | Yellow highlighter stroke sweeps the frame. Behind it: logo lockup + "Dense readings, made readable." and the adapted card (Atkinson, spaced), green grade 4.7 badge, Plain/Simple toggle on Simple | Rising swish into a D add9 bloom, kick + bass enter |
| 3 | 7.0–11.0 | Listen | "Listen. Every sentence lights up as it's read." Cursor presses Listen; sentences light one by one, word underline moving | Each new sentence = a soft marimba note in key |
| 4 | 11.0–15.0 | Your way | "Their font. Their size. Their background." Cursor clicks Lexend, OpenDyslexic, A+, Dark; card restyles live, highlight stays | Soft clicks tuned to the groove |
| 5 | 15.0–18.0 | Fact Guard | "Fact Guard checks every number, date, and name." Review banner + fact chips ($42,000, 2024, 310, 61 percent, Priya Raman, Harmon Foundation) tick green one by one | Rising pentatonic plucks per tick |
| 6 | 18.0–22.0 | Outro | Logo lockup, "Paste it, share one link, done." "Students never log in.", URL pill + real QR to the live site | Bell chord, pad rings out |

Transitions: scene 1→2 is the highlighter wipe (dips through yellow, no double exposure); others stagger (old text out, then new in). Poster frame: settled scene 2.
