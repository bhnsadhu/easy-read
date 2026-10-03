# ReadEasy research

Date: 2026-10-03. Four team briefs merged: dyslexia and literacy evidence (§1), competitors and market (§2), design references and typography (§3), technical (§4). BRAND.md and DECISIONS.md cite these section numbers; do not renumber.

## Method

Each brief was researched on 2026-10-03 from primary sources where reachable, the npm registry, and local test runs (PGlite, Intl.Segmenter, sbd, syllable, hyphen, text-readability, Google Fonts CSS API sizes, the WCAG 2.x contrast formula). Honest caveat: the research sandbox's proxy blocked several primary sites, including bdadyslexia.org.uk, w3.org, PubMed/PMC, linear.app, vercel.com, supabase.com, nextjs.org, MDN, issues.chromium.org and the official sites of Diffit, MagicSchool, Brisk, Beacons and Rewordify. Where that happened, the claim rests on a secondary source (a mirror PDF, a help-center snippet, EdWeek/EdSurge, Common Sense Media, a review site) and is tagged accordingly. Every claim keeps its tag: [Certain] = guideline text, a replicated finding, a primary doc, or a value verified here today; [Likely] = one or two decent studies, or several secondary sources agreeing; [Guessing] = extrapolation, a threshold we chose, or weak evidence. Where a brief's recommendation differed from a logged decision, this file follows DECISIONS.md and BRAND.md and says so.

## 1. Dyslexia and literacy evidence

### What we learned

#### 1.1 British Dyslexia Association Style Guide (2023 edition)
Source: https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf (mirror: https://ako.ac.nz/assets/Knowledge-centre/ALNACC-Resources/Dyslexia-resources/230907-Dyslexia-Friendly-Style-Guide.pdf)
- Sans-serif (Arial, Verdana, Tahoma, Calibri, Century Gothic, Trebuchet, Open Sans); body 12–14pt "or equivalent (1–1.2em / 16–19px)". [Certain]
- Letter spacing ~35% of letter width (more hurts); word spacing >= 3.5x letter spacing; line spacing 1.5; 60–70 characters per line; left-aligned, never justified. [Certain]
- Headings >= 20% larger; bold for emphasis; no underline, italics or all-caps; cream or pastel background, dark (not black) text. [Certain]

#### 1.2 WCAG 2.2
- SC 1.4.12 Text Spacing (AA): content must survive line-height >= 1.5x, paragraph spacing >= 2x, letter-spacing >= 0.12em, word-spacing >= 0.16em. [Certain] https://www.w3.org/WAI/WCAG22/Understanding/text-spacing
- SC 1.4.8 Visual Presentation (AAA): user-selectable colours, <= 80 characters, unjustified, line spacing >= 1.5, 200% resize; SC 1.4.6 (AAA): 7:1 body contrast. [Certain] https://www.w3.org/WAI/WCAG20/Understanding/visual-presentation

#### 1.3 Letter, word and line spacing
- Zorzi et al. 2012 (PNAS, 74 children with dyslexia): +2.5pt letter spacing with word and line spacing scaled doubled accuracy, speed +20%; weakest readers gained most. [Certain] https://pmc.ncbi.nlm.nih.gov/articles/PMC3396504
- Galliussi et al. 2020 (64+64 children): "dyslexia-friendly" letterforms no effect; letter spacing WITHOUT matching word spacing slowed reading. [Likely] https://pmc.ncbi.nlm.nih.gov/articles/PMC7188700
- Spacing gains are not dyslexia-specific; adults read fastest at default spacing. [Likely] https://dare.uva.nl/id/91d8afa0-403c-4532-a551-04114030b29a ; https://dare.uva.nl/id/645926d0-fb89-42af-bde5-5174ab0d4f50
- Rello et al. 2013 "Size Matters (Spacing Not)" (28 adults, eye-tracking): 18pt beat 10 and 26pt; line spacing 0.8–1.8 made no difference. [Likely] https://a11y-paradise.onrender.com/reviews/69c083aebb27ccd8963e779f

#### 1.4 Line length
- Schneps et al. 2013 (103 high-schoolers with dyslexia): short lines helped the weakest decoders; +27% speed, −11% fixations, regressions halved, no comprehension cost. [Likely] https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3734020/

#### 1.5 Fonts
- Rello & Baeza-Yates 2013/2016 (48 dyslexic + 49 control, eye-tracking): sans/mono/roman beat serif/italic; OpenDyslexic not better; italics worst. [Certain] https://a11y-paradise.onrender.com/reviews/69cd7af2bbd7e71582e41407
- Wery & Diliberto 2017 (children 9–12): OpenDyslexic no gain vs Arial/Times; nobody preferred it. [Certain] https://en.wikipedia.org/wiki/OpenDyslexic
- Kuster et al. 2018: Dyslexie font no benefit. [Certain] https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5934461/
- Lexend: one creator-run study of 20 third-graders (+19.8%), not replicated or peer-reviewed. [Likely] https://design.google/library/lexend-readability ; https://www.teleprompter.com/blog/effectiveness-of-lexend-and-opendyslexic-fonts
- Atkinson Hyperlegible: designed for low vision (B/8, O/0, l/1); CSUN 2024 study, no independent dyslexia evidence. [Likely] https://www.csun.edu/cod/conference/sessions/2024/index.php/public/presentations/view/3108.html

#### 1.6 Coloured backgrounds and overlays
- Griffiths et al. 2016 review (51 papers): overlays/lenses "cannot be endorsed"; low-bias trials show no effect; gains match placebo. [Certain] https://eprints.whiterose.ac.uk/id/eprint/104441/
- Rello & Bigham 2017 (341 adults, 89 with dyslexia): at >7:1 contrast, warm backgrounds (peach, orange, yellow) read faster than cool (blue, green); a preference, not a treatment. [Likely] https://a11y-paradise.onrender.com/reviews/69c699716bf81f6dadea1e07

#### 1.7 Text-to-speech and bimodal reading
- Wood, Moxley, Tighe & Wagner 2018 meta-analysis: TTS improves comprehension for reading disabilities, d = 0.35 (95% CI 0.14–0.56). [Certain] https://pmc.ncbi.nlm.nih.gov/articles/PMC5494021/
- Keelor et al. 2023 (ages 8–12): TTS beat silent reading; highlighting vs none did not differ. [Likely] https://pubmed.ncbi.nlm.nih.gov/37119436/
- Reading-while-listening meta-analysis (30 studies, 1,945 participants): trivial for typical readers unless pacing is external; struggling readers gain. [Likely] https://osf.io/dt6ah
- Sentence vs word highlighting: no study shows one beats the other; any highlighting is preferred over none. [Likely] https://dsc.duq.edu/faculty/63 ; https://papers.iafor.org/wp-content/uploads/papers/acset2015/ACSET2015_20150.pdf
- Cunningham (2003, 2011) via Reading Rockets: 140–180 wpm is productive; students left alone crank speed too high. [Likely] https://www.readingrockets.org/topics/assistive-technology/articles/text-speech-tts
- Fluency norms (Hasbrouck & Tindal 2017, 50th percentile, spring): G3 112, G4 133, G5 146, G6 146 wcpm; G7 150, G8 151. [Certain] https://www.readingrockets.org/article/fluency-norms-chart-2017-update

#### 1.8 Reading rulers / line focus
- Niklaus, Cai, Bylinskii & Wallace 2023 (CHI): four ruler designs all raised speed, most for dyslexia; no single favourite. [Likely] https://research.adobe.com/publication/digital-reading-rulers-evaluating-inclusively-designed-rulers-for-readers-with-dyslexia-and-without

#### 1.9 Syllable segmentation
- Colour-coded syllables cut reading time and errors (Italian; 95 2nd-graders). Small samples, non-English. [Likely] https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8822314/ ; https://etd.lib.metu.edu.tr/upload/12625284/index.pdf

#### 1.10 Simplified text
- Rello et al. 2013 "Simplify or Help?" (96 participants, 47 with dyslexia): on-demand synonyms preferred and helped; automatic replacement less welcome. [Likely] https://a11y-paradise.onrender.com/reviews/69c080e9fbe1707d6a0f3216
- Sentence-level simplification breaks cohesion; coherence must be document-level; most simplifiers are evaluated per sentence. [Likely] https://arxiv.org/pdf/2412.18655 ; https://preview.aclanthology.org/fix_video/2020.readi-1.14.pdf

#### 1.11 IDA position
- TTS, reduced reading load, highlighted key information and extra time are accommodations alongside (not instead of) structured literacy. [Likely] https://dyslexiaida.org/fact-sheets/ ; https://or.dyslexiaida.org/wp-content/uploads/sites/20/2019/09/AccommodationFlyerOct2019.pdf

#### 1.12 Stigma and UDL
- "Struggling reader" labels locate the problem in the child and imply fixed ability. [Likely] https://www.landmarkschool.org/our-school/landmark-360-blog/moving-beyond-struggling-reader-labels ; https://pubs.asha.org/doi/10.1044/2018_LSHSS-DYSLC-18-0031
- Students conceal dyslexia and reject support to avoid "looking different", especially in secondary school. [Likely] https://discovery-pp.ucl.ac.uk/id/eprint/10192362 ; https://www.understood.org/en/articles/am-i-cheating-the-shame-i-felt-using-accommodations-for-dyslexia.md
- CAST UDL Guidelines 3.0 (2024): customizable display for everyone up front, not retrofitted accommodations. [Certain] https://udlguidelines.cast.org/more/downloads

### What we decided because of it

Logged as DECISIONS 2–9 and BRAND.md §5, §10. The brief proposed a system sans stack (Arial/Helvetica) as default; the team chose Atkinson Hyperlegible Next (DECISIONS 2), which has no counter-evidence and doubles as the UI face. The brief's approximate hexes (#FAF3E0 / #1F1F1F) gave way to the computed palette in 3.4.

- Font: Atkinson Hyperlegible Next; Lexend and OpenDyslexic as opt-in preferences, never claims (1.5).
- Body 18px, 20px for grade band 3–5, slider 16–28px (BDA 16–19px; Rello 18pt); line-height 1.5, range 1.4–2.0.
- Letter-spacing 0.05em, presets "Wide" 0.12em and "Extra-wide" 0.18em; word-spacing 0.20em (>= 3.5x letter) scaling to 0.42em / 0.63em (WCAG; BDA ratio; Galliussi; em mapping [Guessing]).
- Paragraph gap 2em; max width 65ch plus "One section at a time" (~40ch, Schneps); left-aligned, ragged right, no hyphenation.
- Background cream #FBF7EF with ink #2B2620 (14.0:1); student picks pale blue, soft green, dark or high contrast (BRAND.md §4); tints are comfort settings only (DECISIONS 4).
- Headings 1.25x body, bold; bold is the only emphasis.
- Read-aloud 150 wpm; grade presets 3–4: 130, 5–6: 145, 7–12: 160; quick presets cap at 180, faster only via an advanced control; remembered per student (Cunningham; ORF mapping [Guessing]).
- Highlight the current sentence (soft tint + left bar); word underline when boundary events exist; either alone, or off (Keelor; sentence-vs-word [Guessing]).
- Reading ruler off by default, one tap on, grey-bar and shade styles (Niklaus 2023).
- "Words to know" on demand (tap): syllables, definition, hear it (Rello 2013 "help" > "simplify").
- Levels Original, Plain, Simple (DECISIONS 9): Original always one tap away; Plain and Simple rewrite at document level, keeping connectives and key vocabulary with glosses (1.10).
- One "Reading settings" panel for every student; no "dyslexia mode" (1.12).

### What we chose NOT to do and why

- No OpenDyslexic, Dyslexie or Lexend by default and no font marketed as evidence-based: no gain in controlled studies (Wery & Diliberto 2017; Kuster 2018; Rello 2016). [Certain]
- No selling tints or overlays as treatment for "visual stress": indistinguishable from placebo (Griffiths 2016). [Certain]
- No letter-spacing increase without a proportional word-spacing increase (Galliussi 2020). [Likely]
- No line spacing far beyond 1.5 by default: no measured benefit (Rello 2013). [Likely]
- No italics, underline, all-caps or justified text anywhere in the reader (BDA; Rello). [Certain]
- No silent vocabulary replacement and no sentence-by-sentence simplification: readers prefer on-demand help, and sentence rewriting breaks cohesion (Rello 2013; 1.10). [Likely]
- No free-for-all speed slider: students run TTS too fast to comprehend (Cunningham). [Likely]
- No expectation that highlighting adds comprehension (Keelor 2023), so no bright word-by-word flashing. [Likely]
- No "for dyslexic students", "struggling readers", "low readers" or "remedial" anywhere, and no per-student flags visible to peers (1.12). [Likely]
- No framing ReadEasy as an intervention that teaches reading (IDA, 1.11). [Likely]
- No naive hyphenation as syllabification: errors in a decoding aid are worse than no aid (measured in 4.6). [Guessing]

## 2. Competitors and market

### What we learned

#### 2.1 Product briefs

**Diffit.** Teacher-facing AI leveler (topic, text, URL, PDF or YouTube → passage at grade 2–11+); free tier, Individual $14.99/mo; no student login, export to Docs/PDF. [Certain] https://www.teachfloor.com/blog/diffit ; https://blog.tcea.org/leveled-texts-diffit/ ; https://www.techlearning.com/how-to/diffit-how-to-use-it-to-teach No TTS: "Diffit is a tool that teachers use directly, not students". [Certain] https://support.diffit.me/hc/en-us/articles/25317756737165-Can-students-use-text-to-speech "Show Sources" covers topic mode only [Likely] https://www.educatorstechnology.com/2024/11/diffit-ai-for-teachers-review.html ; nothing verifies a rewrite of a teacher's own upload. [Guessing] 93% Common Sense privacy score. [Likely] https://www.kuraplan.com/reviews/diffit-review Six LLMs including Diffit "reliably wrote passages at a higher grade level than the one specified" [Certain] https://www.edweek.org/technology/using-ai-generated-text-in-reading-class-watch-for-these-pitfalls/2026/09 and swap in "simpler words that don't exactly have the same connotation". [Certain] https://www.edweek.org/teaching-learning/more-kids-are-learning-to-read-on-ai-generated-text-what-are-the-pros-and-cons/2026/08

**MagicSchool AI.** 80+ teacher tools, 50+ student tools (MagicStudent); Plus $8.33/mo annual. [Certain] https://bestaiforeducation.com/reviews/magicschool Rooms: "MagicSchool will only collect the user's first and last name to create an account." [Certain] https://www.magicschool.ai/magicstudent Read-aloud exists, sentence sync undocumented. [Likely] https://www.edutopia.org/article/using-magicschool-support-english-language-learners/ 95% Common Sense privacy rating [Certain] https://www.magicschool.ai/blog-posts/magicschool-common-sense-privacy-rating , but the AI-assistant category is "Moderate Risk": tools "can present single-sided viewpoints as fact... or provide inaccurate information that teachers might miss". [Certain] https://www.commonsensemedia.org/press-releases/ai-teacher-assistants-need-better-safety-measures-common-sense-media-report-finds ; https://www.chalkbeat.org/2025/08/06/ai-teacher-assistants-promote-racial-bias-study-finds/ Reviews: "confident factual errors," "cognitive overload." [Likely] https://www.kuraplan.com/reviews/magicschool-ai-review ; https://gptzero.me/news/magicschool-ai-review/

**Brisk Teaching.** Chrome/Edge extension inside Google Docs; Pro $14.99/mo or ~$99.99/yr; "Change Level" and "Differentiate". [Likely] https://www.edusageai.com/blogs/brisk-teaching-pricing-for-schools-and-districts-in-2026 ; https://www.kuraplan.com/reviews/brisk-teaching-review Boost links: "no accounts... signing in with Google or simply adding a name", but name-only students "could lose their work". [Certain] https://www.briskteaching.com/briskboost No mobile; "sometimes it sounds a bit too 'AI'"; no reader mode. [Certain] https://fltmag.com/brisk-teaching/

**Microsoft Immersive Reader.** Free in M365 and Edge: Read Aloud, Line Focus, Picture Dictionary, syllables, spacing/background. [Certain] https://learn.microsoft.com/en-us/training/educator-center/product-guides/immersive-reader/ Restyles only; never levels. [Certain] https://support.perfectionlearning.com/en/articles/10138683-accessibility-features-with-immersive-reader FERPA "school official". [Certain] https://learn.microsoft.com/en-us/compliance/regulatory/offering-ferpa PDFs get only Read Aloud; scans need separate OCR. [Likely] https://learn.microsoft.com/en-my/answers/questions/2372612/immersive-reader-for-pdfs

**Speechify.** Consumer TTS, Premium $139/yr; word highlighting "best-in-class for ADHD and dyslexia"; personal login, no teacher layer. [Likely] https://costbench.com/software/ai-voice-tools/speechify/ ; https://texttolab.com/blog/speechify-review Signed CA-NDPA [Certain] https://sdpc.a4l.org/agreements/2024-01-26_8266_6489_signed_agreement_file.pdf ; BBB F rating, complaints "about billing". [Certain] https://www.bbb.org/us/fl/miami/profile/education/speechify-inc-0633-92046942/complaints?page=1

**NaturalReader.** EDU Premium $199/yr, per-user. [Likely] https://www.naturalreaders.com/edu.html "OCR fails on low-resolution scans"; "lacks screen masking, a reading ruler"; "highlighting display bugs, with support taking days". [Likely] https://qcall.ai/naturalreaders-review

**Briefly.** Rewordify: free word swaps, click-to-see-original, no login [Certain] https://www.commonsense.org/education/reviews/rewordify ; Helperbird: per-user extension [Likely] https://www.helperbird.com/2026/ ; Snap&Read retired 31 Dec 2025 into Read&Write [Certain] https://www.everway.com/education/dj-product-sunset/ ; BeeLine: gradient line guidance [Likely] https://in.nau.edu/disability-resources/beeline-reader/ ; Google Read Along: K–5 leveled library behind Classroom login [Certain] https://support.google.com/edu/classroom/answer/14174515 ; Chrome reading mode: read aloud with highlighting, no leveling [Certain] https://support.google.com/chrome/answer/14218344

#### 2.2 Positioning table

| Product | Reading levels | TTS + sentence highlight | Word-level decoding help | No-login student link | Fact-check of AI rewrite | Teacher review step | Privacy |
|---|---|---|---|---|---|---|---|
| **ReadEasy (planned)** | Yes, multi-level | Yes, sentence-synced | Tap-a-word, preview | Yes, one class link | Side-by-side diff + flags | Required before publish | No student accounts |
| Diffit | Yes | No | No | No link; export to Docs | Sources only for topic mode | Implicit (edit before export) | 93% CS, no student data |
| MagicSchool | Yes (Text Leveler) | Read-aloud, no sync known | No | Room code, name collected | No | Implicit | 95% CS, Moderate Risk category |
| Brisk | Yes (Change Level) | No | No | Boost link, name or Google | No | Implicit, in Docs | SOC2/FERPA/COPPA |
| Immersive Reader | No | Yes | Syllables, picture dict | M365 identity | n/a | n/a | FERPA school official |
| Speechify | No | Yes (word) | No | Personal login | n/a | n/a | NDPA; billing complaints |
| NaturalReader | No | Yes | Dyslexia font | Per-user account | n/a | n/a | EDU plans [Likely] |
| Rewordify | Word swaps | No | Click-to-original | Yes | n/a | No | Free, no login |
| Read&Write (ex Snap&Read) | Word swaps | Yes | OCR, readability | District license | n/a | No | District contract |
| BeeLine | No | No | Gradient only | Per-user | n/a | n/a | n/a |
| Read Along / Chrome | Pre-leveled library | Yes | Decoding feedback | Classroom login | n/a | Assign only | On-device speech |

[Likely] for competitor cells unless cited in 2.1.

#### 2.3 Five hardest judge questions

**1. "Isn't this Diffit plus Immersive Reader?"** Those are two products with a hand-off in between: Diffit exports a Doc and itself tells teachers to find a separate TTS tool ([Certain] Diffit support link above). Nobody owns upload → level → verify → publish → read-with-support. ReadEasy's unit of value is the published student page, not the worksheet.

**2. "MagicSchool already has student rooms with read-aloud."** MagicStudent is a chat workspace that creates a student record (name collected) and sits in a category Common Sense rates Moderate Risk. ReadEasy exposes no AI to students; the student only sees a teacher-approved artifact, with zero accounts. That's a district-procurement story, not just a feature.

**3. "Immersive Reader is free in every Microsoft school."** It restyles text; it cannot level, check comprehension, or handle a photographed worksheet (PDFs get Read Aloud only). We take messy inputs (photo, scan, URL) and produce something IR has nothing to read. We should still say "works alongside IR."

**4. "AI rewrites change meaning. How do you stop that?"** Concede the evidence: six LLMs including Diffit leveled too high and altered connotation ([Certain] EdWeek). Our answer is structural: mandatory teacher review, sentence-aligned side-by-side diff, flagged dropped facts/numbers/names, and a readability measure shown next to each level. No competitor verifies a rewrite of the teacher's own document.

**5. "Science of Reading says stop leveling down."** Cite EdSurge's critique ([Certain] https://www.edsurge.com/news/we-must-stop-using-ai-to-level-down-our-students). ReadEasy's default keeps the original text with scaffolds (TTS, tap-a-word, word preview, quick checks); lower levels are optional on-ramps the teacher chooses, and quick checks test grade-level ideas.

#### 2.4 Gaps teachers complain about (quoted)

Leveling accuracy and meaning drift (EdWeek, 2.1); "Every quiz, every passage... needs your eyes before it reaches a student" https://www.kuraplan.com/reviews/magicschool-ai-review ; tools as "invisible influencers" (Common Sense, 2.1); "highlighting display bugs... support taking days" https://qcall.ai/naturalreaders-review ; billing trust (Speechify, 2.1); AI tools "promoting this practice" of leveling down https://www.edsurge.com/news/we-must-stop-using-ai-to-level-down-our-students

#### 2.5 Beacons onboarding patterns to borrow

Sources (official page blocked; secondary): https://whop.com/blog/what-is-beacons-ai/ ; https://bloggingx.com/beacons-ai-review/ ; https://digitalsoftwarelabs.com/ai-reviews/beacons-ai/ [Likely]

1. Three questions, then a page; "the preview updates as you go." ReadEasy: grade band, subject, support profile → live preview.
2. Pre-fill from what exists. ReadEasy: the first upload *is* the onboarding; the class page appears populated before any settings screen.
3. Claim the handle first: `readeasy.app/ms-lopez` in step one, so the share link exists before the content.
4. Design packs, not settings: curated presets in one tap (naming constrained by DECISIONS 8).
5. Time-to-live under five minutes, stated as a promise; the demo should hit publish inside 90 seconds.
6. An AI sidekick that narrates: a review assistant explaining what it changed and why doubles as the fact-check surface.
7. Anti-pattern: reviewers flag upsells and "hidden costs" (https://autoposting.ai/blog/beacons-ai-review); keep the core teacher flow free.

### What we decided because of it

- Fact Guard is the headline trust feature (DECISIONS 14): mandatory review before publish, sentence-aligned side-by-side diff, flags for dropped facts/numbers/names, a readability figure next to each level.
- Students see no AI, no chat, no accounts: only teacher-approved artifacts on one class link (DECISIONS 15); zero student data is the procurement story.
- Try-before-signup: the first upload is the onboarding, sign-in only to publish, class handle claimed in step one (DECISIONS 16; Beacons 2–3, Duolingo in 3.1).
- The unit of value is the published student page: Publish inside 90 seconds in the demo; works on phone, tablet and Chromebook with no extension.
- Original is the default level with scaffolds (Listen, Words to know, quick checks); Plain and Simple are optional on-ramps (judge question 5; DECISIONS 9).
- Say "works alongside Immersive Reader" and take the inputs it cannot: photos, scans, URLs. Core teacher flow stays free.

### What we chose NOT to do and why

- No student-facing AI chat: the MagicStudent category is rated Moderate Risk and creates student records. https://www.commonsensemedia.org/press-releases/ai-teacher-assistants-need-better-safety-measures-common-sense-media-report-finds
- No per-student accounts: they block the one-link classroom, and name-only accounts "could lose their work". https://www.briskteaching.com/briskboost
- No browser extension or Docs-only delivery (Brisk, Helperbird): Chrome/Edge-only, no mobile. https://fltmag.com/brisk-teaching/
- No export-and-print delivery (Diffit): it ends at the hand-off judge question 1 exposes. https://support.diffit.me/hc/en-us/articles/25317756737165-Can-students-use-text-to-speech
- No presets named "Dyslexia", "Focus", "ELL" as the brief phrased Beacons pattern 4: DECISIONS 8 and the BRAND.md banned-words list rule out reader-labelling names (1.12).
- No "level down by default": EdSurge's critique is the strongest pedagogical attack. https://www.edsurge.com/news/we-must-stop-using-ai-to-level-down-our-students
- No "Show Sources"-style check as verification: it covers topic-generated text, not the teacher's own document. https://www.educatorstechnology.com/2024/11/diffit-ai-for-teachers-review.html

## 3. Design references and typography

### What we learned

#### 3.1 What each reference product does well

- **Beacons** [Likely]: an auto-built page with pre-filled blocks, so editing "starts from something concrete instead of an empty canvas"; the share-ready link is the first-run win. https://sacra.com/chat/h/be6a5a4f-2815-47ae-9090-afb5f03c1622/
- **Linear** [Likely]: hierarchy by weight and opacity, not hue; one accent only for CTAs/active states; copy short, specific, technical-warm. https://skills.sh/blink-new/claude/linear-design
- **Arc** [Likely]: one bold, moving-color first-run moment, then restraint. https://www.inverse.com/input/design/the-browser-company-arc-design-interview
- **Notion** [Likely]: three questions then a pre-loaded workspace; empty states give exactly one action. https://candu.ai/blog/how-notion-crafts-a-personalized-onboarding-experience-6-lessons-to-guide-new-users
- **Duolingo** [Likely]: first lesson *before* signup (a credited retention win); coach-like micro-copy. https://screensdesign.com/articles/duolingo-onboarding-design/ , https://design.duolingo.com/writing/voice
- **Headspace** [Likely]: color and space deliver "the first dose of calm before users read anything"; exitable intros cut a 38% drop-off. https://raw.studio/blog/how-headspace-designs-for-mindfulness/

#### 3.2 Display font candidates

Latin-subset woff2 sizes measured from the Google Fonts CSS API (2026-10-03) [Certain]:

| Font | Styles | Variable | Latin woff2 | Fit |
|---|---|---|---|---|
| Fraunces | wght 100–900, opsz 9–144, SOFT, WONK | yes | 65 KB (one file) | warm soft serif, confident at display |
| Bricolage Grotesque | wght 200–800, wdth, opsz 12–96 | yes | 128 KB | expressive, but a second sans next to Atkinson |
| Instrument Serif | 400 + italic only | no | 14 KB | elegant, condensed, no bold, fashion-y |
| Young Serif | 400 (family expanding) | partly | 18 KB | friendly, slightly bookish |
| Gloock | 400 only | no | 17 KB | high contrast, editorial, cold |
| Newsreader | wght 200–800, opsz 6–72 | yes | 128 KB | text serif, less personality |
| DM Serif Display | 400 only | no | 17 KB | sharp, corporate-editorial |
| Playfair Display | 400–900 | yes | 37 KB | overused, very high contrast |
| Lora | 400–700 | yes | 36 KB | text face, not display |
| Outfit / Sora | 100–900 / 100–800 | yes | 31 / 32 KB | geometric sans, startup-generic |
| Familjen Grotesk | 400–700 | yes | 18 KB | nice but another sans |

Fraunces axes: opsz 9–144, wght 100–900, SOFT 0–100, WONK 0/1 (auto-wonky above opsz 18). [Certain] https://github.com/undercasetype/Fraunces , https://fonts.google.com/specimen/Fraunces/about Bricolage: 3 axes, ink traps at large sizes. [Likely] https://fontalternatives.com/fonts/bricolage-grotesque/

Pick: Fraunces (OFL). Serif-vs-sans contrast with Atkinson gives hierarchy without a second sans; one 65 KB file covers every headline weight; the SOFT axis dials "warm, not twee" (`opsz 72, wght 600, SOFT 50, WONK 0` keeps hairlines thick enough for projectors). Runner-up: Bricolage Grotesque if all-sans.

#### 3.3 Reading fonts

- **Atkinson Hyperlegible Next** [Certain]: launched Feb 10 2025; variable wght 200–800 + italics; 33 KB latin variable woff2 via the Google Fonts CSS API (original 2019 family: 4 static styles, ~10 KB each). https://fonts.adobe.com/fonts/atkinson-hyperlegible-next , https://fontsource.org/fonts/atkinson-hyperlegible-next/install , https://fonts.google.com/specimen/Atkinson+Hyperlegible/about
- **Lexend** [Certain unless noted]: variable wght 100–900; 38 KB. The proficiency claim rests on "a single study of 20 children" [Likely]; the 2022 TOCHI study (Wallace, Bylinskii, Kerr et al.) found a 35% WPM spread between each reader's fastest and slowest font, no one font fits all, and preference predicted speed for only 20% of readers [Likely]. https://typedrawers.com/discussion/comment/43203 , https://research.adobe.com/publication/towards-individuated-reading-experiences-different-fonts-increase-reading-speed-for-different-individuals
- **OpenDyslexic** [Certain unless noted]: SIL OFL 1.1; not on Google Fonts (declined for lack of evidence) [Likely]; repo archived Aug 2025, now https://forge.hackers.town/antijingoist/opendyslexic . Measured woff2: Regular 101 KB, Bold 106 KB.
- **Next.js hosting** [Certain]: `next/font/google` and `next/font/local` self-host at build time and inject `size-adjust` fallback metrics so CLS is ~0; preload only Atkinson Next; switch via `data-font` on the reader root. https://nextjs.org/docs/app/api-reference/components/font

#### 3.4 Color (ratios computed with the WCAG 2.x formula) [Certain]

Context: BDA advises dark (not black) text on cream/pastel, no red/green pairs [Likely] https://dyslexiascotland.org.uk/contrasting-advice-what-colours-are-best-for-accessibility/ ; Immersive Reader publishes no theme hexes [Likely]; Pocket sepia is #F4ECD8 / #5B4636 [Likely].

Surfaces (text = Ink #2B2620 unless noted):
- Cream (default) #FBF7EF: Ink 14.0:1; Muted #5F574D 6.7:1
- Deep cream #F6EFE2: 13.1:1. Sepia #F4ECD8: 12.7:1
- Pale blue #EAF1F8: 13.2:1. Soft green #ECF3E8: 13.2:1. Peach #FBEFE6: 13.3:1
- Dark #1B1A18 with text #ECE6DA: 14.0:1 (white 17.4:1)
- High contrast: #FFFFFF on #000000 21:1; #FFE66D on #000000 16.8:1

Accent Teal #0E6F63: on cream 5.66:1 (AA text, AAA large); white label on it 6.05:1; deep variant #0B5F55 7.06:1 (AAA); dark-mode lift #3FBFAD 7.67:1 on #1B1A18. Why teal: not red/green (BDA), far from the highlighter in hue, unlike the orange of Headspace and Immersive Reader. Alternatives that also pass: Plum #6A3FA3 (6.9:1), Rust #9E3A14 (6.4:1), Indigo #3B4BCB (6.4:1).

Highlighter #FFE66D on cream: Ink on it 12.0:1; teal on it 4.84:1. Caveat: vs cream it is only 1.17:1, so the highlight is a hue cue, not a luminance cue; a redundant 2px underline/left bar is needed for low-vision and grayscale users (the brief proposed #9A7A12, 3.8:1, passing 1.4.11 non-text). Dark-mode highlight #5C4A0A: text #ECE6DA on it 6.93:1, 2.0:1 vs #1B1A18 (pair with the bar). Softer option #6B5712 (5.64:1).

#### 3.5 Logo-mark concepts (shapes only)

1. **The Lit Line**: a rounded square; inside, three short horizontal bars, the middle one drawn as a fat yellow highlighter stroke slightly longer than the others. Reads at 16px as "text with one line glowing"; on a projector the single yellow bar is unmistakable. Monochrome: middle bar filled, others outlined. **Chosen** (DECISIONS 13; spec in BRAND.md §3).
2. **Open Arch**: a lowercase "e" as one continuous rounded stroke with an oversized counter, the crossbar extended right like a reading cursor/bookmark tab. Letter-as-mark; teal fill, cream counter.
3. **Page & Beam**: a soft-cornered page with its top-right corner folded; from the fold a short tapered beam (speech/sound) extends right, hinting at read-aloud. Two shapes, one color; the beam can be yellow.

#### 3.6 Motion

- Respect `prefers-reduced-motion: reduce` by *reducing*, not deleting; WCAG 2.3.3 (AAA) requires interaction-triggered motion be disableable, 2.2.2 (A) requires pause for anything moving >5s. [Likely] https://dequeuniversity.com/resources/wcag2.1/2.3.3-animations-from-interactions , https://benmyers.dev/encyclopedia/reduced-motion
- Vercel/Emil Kowalski: 150–250ms tooltips, 200–300ms modals, `ease-out` for entering/exiting; Geist tokens reported as `--motion-fast: 150ms`, `--ease-standard: cubic-bezier(0.2, 0, 0, 1)`. [Likely, third-party] https://mcpservers.org/agent-skills/vercel/web-animation-design , https://open-design.ai/plugins/design-system-vercel/

#### 3.7 Voice and tone

- Headspace: "Be kind to your mind." [Certain] https://uxdesign.cc/reviewing-good-examples-of-tone-of-voice-a25d93c8b14c
- Duolingo: "These reminders don't seem to be working. We'll stop sending them for now." [Certain] https://taplytics.com/blog/duolingo-sends-push-notifications-to-let-users-know-they-know-theyre-not-engaging-with-their-reminders
- Linear: "Linear is a purpose-built tool for planning and building products." [Certain] https://linear.app/partners/aakash
- Shared trait: one idea per sentence, the product takes responsibility ("We'll stop").

### What we decided because of it

- Fraunces at `wght 600, opsz 72, SOFT 50, WONK 0` on teacher side and landing only, never below 28px; student side all Atkinson Hyperlegible Next (DECISIONS 10). Reading faces: Atkinson Next (default, preloaded), Lexend and OpenDyslexic Regular + Bold (lazy), switched via `data-font`.
- Palette: cream #FBF7EF, ink #2B2620 (14.0:1), teal #0E6F63 (5.66:1), accent-strong #0B5F55 (7.06:1), highlight #FFE66D reserved for the spoken sentence, paired with bar #8C6D0B at 4.56:1 (DECISIONS 11): darker than the brief's #9A7A12 so it clears 4.5:1, not just the 3:1 non-text floor. Dark mode #1B1A18 / #ECE6DA / #3FBFAD / highlight #5C4A0A with a #FFE66D bar.
- Student backgrounds: Cream, Pale blue, Soft green, Dark, High contrast (BRAND.md §4); deep cream, sepia and peach pass but are not in the v1 picker. Six class themes (Teal, Plum, Rust, Indigo, Forest #2F6B3A, Berry #A3265E), all >= 5.9:1 on cream; highlight yellow never changes (DECISIONS 12). Mark: "the lit line" (DECISIONS 13).
- Motion: 120ms hover/press, 180ms confirmations, 240ms sheets, `cubic-bezier(0.2, 0, 0, 1)`, sentence highlight 0ms; reduced motion = 100ms, opacity-only. One "wow" moment: the first adapted material fades in with a 40ms stagger, never again that session (Arc).
- Voice: teacher copy like Linear (sharp colleague), student copy like Headspace (calm coach). First run: a finished-looking draft and the class link before any settings screen (Beacons, Notion, Duolingo).

### What we chose NOT to do and why

- No second sans for display (Bricolage, Familjen, Outfit/Sora): it competes with Atkinson instead of giving hierarchy (3.2).
- No Fraunces on the student side, below 28px, or for body copy: hairlines thin out and reading faces must be sans (1.5).
- No promised reading outcomes from any font: no one font fits all; preference predicted speed for only 20% of readers. https://research.adobe.com/publication/towards-individuated-reading-experiences-different-fonts-increase-reading-speed-for-different-individuals
- No orange accent (Headspace, Immersive Reader) and no red/green pairs carrying meaning alone. https://dyslexiascotland.org.uk/contrasting-advice-what-colours-are-best-for-accessibility/
- No hue-only highlight: yellow vs cream is 1.17:1, so the bar is mandatory (3.4).
- No deleting motion under reduced-motion and no decorative animation (WCAG 2.3.3 / 2.2.2). https://dequeuniversity.com/resources/wcag2.1/2.3.3-animations-from-interactions
- No yellow anywhere except the spoken sentence, and no mark on yellow (BRAND.md §3, §4).

## 4. Technical

### What we learned

#### 4.1 Web Speech API (speechSynthesis) in 2026

Quirk list:
- Chrome loads voices async: `getVoices()` is empty until `voiceschanged`; listen and re-query. [Certain] (https://developer.mozilla.org/docs/Web/API/SpeechSynthesis/getVoices)
- Chrome desktop stops any utterance after ~15 s with a non-local (Google network) voice, then the queue wedges until `cancel()`. Chromium 41346274, still reproduced in 2025. [Likely; issues.chromium.org blocked] (https://issues.chromium.org/issues/41346274, https://dev.to/jankapunkt/cross-browser-speech-synthesis-the-hard-way-and-the-easy-way-353)
- `boundary` (word) events: Chrome/Edge desktop fire per word [Certain]; **Chrome Android never fires** (Chromium 40715888; MDN BCD corrected in mdn/browser-compat-data#6772) [Certain] (https://github.com/mdn/browser-compat-data/issues/6772); Safari macOS fires but often per sentence and without `charLength` [Likely]; iOS/iPadOS (all WebKit) unreliable, treat as absent [Likely]; Firefox depends on OS backend: Windows/macOS fire, Linux inconsistent, Android no [Likely] (https://bugzilla.mozilla.org/show_bug.cgi?id=1003457).
- `pause()/resume()`: Chrome Android `pause()` ends the utterance, `resume()` is a no-op (mdn/browser-compat-data#4500). [Likely]
- Backgrounding: Chrome desktop keeps speaking but silences other speaking tabs; mobile stops speech on screen lock/app switch. [Likely] (https://engineering.ibmix.de/blog/2024/08/speechless-in-the-frontend)
- `cancel()` then `speak()` in the same tick can go silent (iOS, sometimes Chrome): defer `speak()` ~50 ms. [Likely]
- Rate: Chrome breaks above ~2; iOS maps web rate to AVSpeech rate badly above 1 (WebKit 258587). [Likely] (https://bugs.webkit.org/show_bug.cgi?id=258587)
- iOS Safari: `speak()` must run synchronously inside a user-gesture handler (`RequireUserGestureForSpeechStart`) or it silently no-ops; utterances chained from `onend` work once unlocked. The ring/mute switch silences speech; workaround is a short silent `<audio>` in the same gesture plus a "flip the mute switch" hint. Voices are whatever is installed under Settings → Accessibility → Spoken Content; prefer `localService === true`. [Likely]
- ChromeOS: "Chrome OS US English" (offline, `localService: true`) plus eSpeak-NG (robotic); Google network voices appear only online and hit the 15 s bug. [Likely] (https://support.google.com/chromebook/answer/11221616)

Recommended architecture (sentence per utterance):
1. Segment into sentences server-side (4.6); store `{id, text, charStart}`.
2. One utterance per sentence, chained in `onend`/`onerror`. This defeats the 15 s bug, gives sentence highlighting everywhere without boundary events, and makes pause = cancel/restart-at-sentence.
3. Word highlighting is progressive enhancement: if a `boundary` with `name === 'word'` arrives within ~1.5 s of utterance start, use events; else estimate position as `elapsed / (words ÷ (wpm(rate)/60))`, ~160 wpm at rate 1, scaled linearly, re-synced at each `onend` so drift never accumulates. [Guessing on constants; calibrate per voice from measured `onend` times]
4. `cancel()` on `pagehide`/`visibilitychange`; show "tap to resume" on return.
5. Feature-detect voices; if none (locked-down Chromebooks), fall back to read-along without audio.

#### 4.2 Next.js / React / Vercel

- **Next.js 16.3.8**, **React 19.3.0** (both published 2026-10-02). Next 16 is Active LTS; Next 15 EOL 2026-10-21. [Certain versions via `npm view`; Likely dates]
- `middleware.ts` → **`proxy.ts`** with `export function proxy()`, Node runtime; codemod `npx @next/codemod@canary middleware-to-proxy`; Turbopack default for dev and build. [Certain] (https://nextjs.org/blog/next-16)
- **Vercel limits** (Fluid compute, Node): max duration Hobby 300 s; Pro/Enterprise default 300 s, max 800 s via `maxDuration`. **Request/response body cap 4.5 MB** on all plans; streamed responses are exempt. [Likely; vercel.com blocked, matches 2025 changelog] (https://vercel.com/docs/functions/limitations, https://vercel.com/changelog/higher-defaults-and-limits-for-vercel-functions-running-fluid-compute)
- Consequence: never POST files through a route handler. Server action issues a Supabase **signed upload URL** → browser uploads directly (`uploadToSignedUrl`) → server action downloads from Storage and parses.

#### 4.3 Supabase

- `@supabase/ssr` **0.12.7**, `@supabase/supabase-js` **2.117.2**. [Certain]
- SSR: `createServerClient` with `cookies: { getAll, setAll }`; `lib/supabase/proxy.ts` called from `proxy.ts` builds a client over `request.cookies` and **immediately** calls `supabase.auth.getClaims()` (verifies the JWT locally against cached JWKS); never trust `getSession()` server-side. [Certain] (https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- **Email rate limits**: built-in SMTP ≈ **2 emails/hour per project**, only to team members' addresses, "can change without notice"; 60 s per-user resend window; custom SMTP starts at 30/hour, raisable under Auth → Rate Limits. [Likely for numbers; mechanism Certain] (https://supabase.com/docs/guides/auth/rate-limits)
- Anonymous read by share token: (a) a policy on the token column (`to anon using (published and share_token = current_setting('request.headers', true)::json->>'x-share-token')`) exposes the table to anon selects and invites enumeration; (b) **security-definer RPC** (recommended): `get_published_doc(p_token text) … security definer set search_path = public` returning only public columns where `published and share_token = p_token`, `revoke all on table from anon`, `grant execute to anon`; token = `gen_random_bytes(16)` in a unique indexed column; add `revoked_at`. [Certain mechanics; recommendation is judgement]
- Storage: `createSignedUploadUrl(path)` server-side, valid **2 h**; client `uploadToSignedUrl(path, token, file)` needs no RLS. Standard upload recommended <= 6 MB; set bucket `fileSizeLimit` (e.g. 25 MB) and `allowedMimeTypes`. [Certain sizes; Likely 2 h]
- **RLS tests without Docker**: `@electric-sql/pglite` **0.5.8** = PostgreSQL 18.3 in WASM. Live test today: `create role anon/authenticated`, `grant`, `enable row level security`, policies reading `current_setting('request.jwt.claims', true)::json->>'sub'`, then `set role anon` → **policies enforced** (matching token 1 row, wrong token 0, wrong `sub` 0, insert without grant → "permission denied"). The default connection is superuser and bypasses RLS, so tests must `set role`. pglite#274 ("RLS not working") is closed. Gaps: no `auth.uid()`/`auth.jwt()` (shim over `request.jwt.claims`), no Storage schema, no `pg_net`. `embedded-postgres` 18.4.0-beta.17 downloads a ~30 MB native binary per platform. [Certain] (https://github.com/electric-sql/pglite/issues/274)

#### 4.4 Parsing (Vercel Node runtime)

- **PDF text**: `unpdf` **1.8.1** (serverless PDF.js 5.6 build, no `canvas`; `extractText(data, { mergePages })`). `pdf-parse` 2.4.5 drags `pdfjs-dist` + optional canvas and is historically flaky on Vercel. [Certain versions; Likely behaviour] (https://github.com/unjs/unpdf)
- Scanned detection: a page is "scanned" if < ~50 non-space chars; >= 50% scanned pages sends the whole file to vision. [Guessing thresholds]
- Scanned PDFs → Claude as a `document` block (base64 or Files API `file_id`); Claude extracts text and renders each page as an image. Limits: 32 MB request, 600 pages (100 on 200k-context models such as Haiku 4.5), no encryption. [Certain] (https://platform.claude.com/docs/en/build-with-claude/pdf-support) Images: JPEG/PNG/GIF/WebP, <= 10 MB, <= 8000 px; downscale to <= 2000 px long edge. [Certain] (https://platform.claude.com/docs/en/build-with-claude/vision)
- DOCX: `mammoth` **1.13.0**. Sniffing: `file-type` **22.1.1** (ESM-only; not text formats, so unknown + valid UTF-8 ⇒ `.txt`); never trust `File.type`. URL import: `@mozilla/readability` **0.6.0** + `linkedom` **0.18.13** (DOMPurify does not work on it, so emit text/markdown, not HTML). [Certain versions]
- SSRF checklist: http(s) only; `dns.lookup({all:true})` and reject loopback, link-local (169.254/16 metadata), RFC1918, ULA/IPv4-mapped IPv6, `localhost`; `fetch(..., { redirect: 'manual' })` and re-validate every `Location` (<= 3 hops); 10 s timeout; 5 MB body cap; pin the resolved IP via undici `connect` to close the rebind window. `ssrf-guard` 1.0.0 handles octal/hex IP forms. [Certain pattern] (https://github.com/jonathanong/ssrf-guard)

#### 4.5 Anthropic API (Oct 2026)

Source: https://platform.claude.com/docs/en/about-claude/pricing (fetched today). [Certain]

| Role | Model ID | $/MTok in/out | Notes |
|---|---|---|---|
| Fast (level detection, PII pre-check, short rewrites) | `claude-haiku-4-5` | 1 / 5 | 200K context → 100-page PDF cap |
| Strong default | `claude-opus-5-5` | 4 / 20 (cache read 0.20) | 1M context, 128K output, thinking always on, effort default `medium` |
| Mid-tier | `claude-sonnet-5-5` | 2 / 10 | 1M context, 128K output |

- Batch API 50% off; cache reads 0.1x (0.05x on Opus 5.5): cache the system prompt + rubric. PDF/vision input is GA on all current models. [Certain]
- Structured output via `output_config: { format: { type: 'json_schema', schema } }` (GA, no beta header; `additionalProperties:false` required). Gotchas: no assistant prefill; `tool_choice: any/tool` rejected on Opus 5.5/Sonnet 5.5; thinking cannot be disabled on Opus 5.5, so use `output_config.effort: 'low'`; handle `stop_reason: 'refusal'`. SDK `@anthropic-ai/sdk` **0.131.0**. [Certain] (https://platform.claude.com/docs/en/build-with-claude/structured-outputs)

#### 4.6 Sentences, syllables, reading level

- `Intl.Segmenter('en', {granularity:'sentence'})` is Baseline (Chrome 87, Safari 14.1, Firefox 125). Tested today on Node 22 / ICU 77: `"Dr. Smith went home. He was tired."` → `["Dr. ", "Smith went home. ", "He was tired."]`; `"…Mr. Jones at 5 p.m. Then…"` → two false breaks; but `"The U.S. is big."` and `"$3.50."` are correct (UAX#29 suppresses a break only when lowercase follows). V8 exposes no CLDR abbreviation suppressions. [Certain] (https://github.com/tc39/proposal-intl-segmenter/issues/50)
- `sbd` 1.0.19 (tiny, dependency-free, unmaintained since 2022) got the same text fully right: `["Dr. Smith went to the U.S. in May.","He saw Mr. Jones at 5 p.m.","It cost $3.50.","Wow!"]`. [Certain] `compromise` 14.17.0 also has `.sentences()` but is heavy.
- Syllables (20 common words tested today): `syllable` 5.0.1 = 17/20 (misses *science, poem, area*); `hyphen` 1.14.1 en-us as a counter = 13/20 (hyphenation ≠ syllabification: "every", "idea" → 1). [Certain]
- `text-readability` 1.1.1 (`fleschKincaidGrade`, `fleschReadingEase`, `daleChallReadabilityScore`; uses `syllable`). Short texts give nonsense (4 sentences scored grade −3.2). [Certain]

#### 4.7 PII detection (local)

- Own regex core (email, US phone, SSN, student ID, DOB keywords) plus education heuristics (`IEP|504|accommodation|special education|free/reduced lunch|ELL|diagnos`, "name + score" tables). [Guessing; no library covers this] Libraries: `@redactpii/node` 1.0.19 and `openredaction` 1.1.5; `redact-pii` is deprecated; NER options too heavy. [Certain versions] (https://github.com/wrannaman/redactpii-node)

#### 4.8 Load testing and Lighthouse CI

- `autocannon` 8.0.0 (pure Node, no external service) and `@lhci/cli` 0.15.1 (`lighthouserc.js`, `numberOfRuns: 3`, `assert.preset: 'lighthouse:recommended'` plus accessibility >= 0.95) both run in GitHub Actions against `next start`. [Certain versions] (https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md)

#### 4.9 PWA in Next 16 App Router

- `app/manifest.ts` is built in. `@serwist/next` **9.5.12** is a webpack plugin, so Turbopack-default Next 16 needs **`@serwist/turbopack`** 9.5.12 (docs: https://serwist.pages.dev/docs/next/turbo). A hand-written SW (`NetworkFirst` for `/r/[token]`, `CacheFirst` for fonts) is enough for offline reading; OS voices make offline read-aloud work if a `localService` voice exists. iOS still needs the gesture unlock after every reload; managed Chromebooks can disable service workers. [Certain versions; Likely setup]

#### Biggest technical risk

Speech + highlighting on **iOS Safari and Chrome Android**: no word boundary events, gesture-gated `speak()`, broken pause/resume, mute-switch silence, rate-mapping bugs. The sentence-per-utterance design with estimated word timing is the only approach that works on all three demo device classes; build and test it on a real iPad and Chromebook first.

### What we decided because of it

- Read-aloud is one utterance per sentence chained in `onend`; pause = `cancel()` + remembered sentence index; word underline only when a `boundary` event arrives within ~1.5 s, else estimated timing re-synced per sentence. Rate UI clamped to 0.5–1.5, mapped to the 150 wpm default and 180 wpm cap in DECISIONS 5. Prefer `localService` voices; read-along without audio if none.
- Uploads never pass through a route handler: server action mints a signed upload URL (2 h), browser uploads to Storage, server parses from Storage (Vercel 4.5 MB cap). Bucket `fileSizeLimit` 25 MB; `file-type` sniffs, `File.type` is ignored.
- Public student pages read through a security-definer RPC keyed by a 16-byte random token with `revoked_at` ("Rotate link"); anon has no table grants.
- RLS policies are unit-tested on PGlite in Vitest with `set role` per test (DECISIONS 17), plus a nightly pgTAP run on a real Supabase branch.
- Custom SMTP (Resend/Postmark) before demo day; the built-in 2 emails/hour limit would break sign-in on stage.
- Models: `claude-haiku-4-5` for level detection, PII pre-check and short rewrites; `claude-opus-5-5` (effort `low`) as the strong default; `claude-sonnet-5-5` mid-tier. Structured outputs with a `{ title, sentences: [{ text, hardWords }], readingLevel }` schema so rewritten text arrives one sentence per element; system prompt + rubric cached; scans and photos sent as `document`/image blocks at <= 2000 px.
- Parsing: `unpdf`, `mammoth`, `@mozilla/readability` + `linkedom` emitting markdown, SSRF checklist on every fetch. Sentences segmented once server-side with `sbd`; `syllable` for counts, `hyphen` for visual chunking (`pho-to-syn-the-sis`) shown only on tap in Words to know; readability on >= 100 words, shown as "≈ grade N".
- PII: own regex module + `@redactpii/node` as a second opinion, opt-in Haiku 4.5 classification; flags go to the teacher, never block. CI: autocannon + `@lhci/cli` (accessibility >= 0.95). First build target: a real iPad and a Chromebook.

### What we chose NOT to do and why

- No reliance on `boundary` events: Chrome Android never fires them, WebKit is unreliable (https://github.com/mdn/browser-compat-data/issues/6772).
- No `pause()`/`resume()`: Chrome Android ends the utterance on `pause()`; cancel-and-restart sidesteps every known pause bug.
- No long utterances or Google network voices by default: the ~15 s Chrome cut-off (https://issues.chromium.org/issues/41346274).
- No rate above 1.5: Chrome breaks above ~2, iOS maps rates badly above 1 (https://bugs.webkit.org/show_bug.cgi?id=258587), and 1.7 says fast playback hurts comprehension.
- No file POSTs through route handlers: Vercel's 4.5 MB body cap (https://vercel.com/docs/functions/limitations).
- No anon select policy on the share-token column: it exposes the table and invites enumeration; no `getSession()` server-side and no `middleware.ts` (https://supabase.com/docs/guides/auth/server-side/creating-a-client, https://nextjs.org/blog/next-16).
- No Docker or `embedded-postgres` for RLS tests: no daemon in the build environment; PGlite enforces real policies (https://github.com/electric-sql/pglite/issues/274).
- No `pdf-parse` or `pdfjs-dist` + canvas on Vercel, and no server-side rasterising when Claude reads the PDF directly (https://github.com/unjs/unpdf).
- No `Intl.Segmenter` alone for sentences (two false breaks today, https://github.com/tc39/proposal-intl-segmenter/issues/50); no `hyphen` as a syllable counter (13/20); no readability scores on short texts (grade −3.2 on four sentences).
- No NER-based PII detection and no auto-blocking on a PII flag; no `@serwist/next` (webpack plugin; Next 16 builds with Turbopack).
