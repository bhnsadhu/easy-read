# Demo script (2 minutes)

## Before you start

- Open the deployed URL on a laptop and keep your phone unlocked with the camera ready.
- Confirm `/api/health` returns `ok: true` with `db: postgres` and `llm: anthropic`.
- Sign in once beforehand so the magic-link email isn't on the clock. Have a class created already ("Ms. Rivera's 7th grade science").
- Have a messy handout ready: a phone photo of a worksheet or a PDF. Keep the sample reading as a fallback (the "Use a sample reading" button).
- Turn the laptop volume up. Test one sentence of read-aloud in the browser you'll use.

## Script

1. **The problem (10 s).** "A third of a class can't get through a dense handout. The teacher has five minutes between periods."
2. **Upload (20 s).** Landing page → Upload a file → the photo. The extracted text appears in the box. Click **Make it readable**.
3. **Review (30 s).** Sections appear one by one. Point at the grade estimate per level. Find the **Fact Guard** flag: "1 fact was dropped: 1779." Say: "Every rewrite is checked against the original for every number, date, name, and term. If anything is missing we keep the original wording and tell the teacher exactly what was dropped. Nobody else does this on the teacher's own document." Click **Keep original here**.
4. **Publish (10 s).** Click **Publish**. Click **QR for projector**.
5. **Student (40 s).** Scan the QR with the phone. Class page → tap the material. "Words to know" with play buttons; tap one. Tap **Start reading**, then the big play button: the sentence lights up as it's read. Tap another sentence to jump. Tap a word: hear it, see syllables and the definition. Open **Reading settings**: switch to OpenDyslexic, widen the spacing, pick pale blue. Switch level to **Simple**, then back to **Original**.
6. **Close (10 s).** "No student accounts, no tracking. One link per class. The original is always one tap away."

## The five hardest questions

**"Isn't this Diffit plus Immersive Reader?"** Those are two products with a copy-paste in between; Diffit's own support page says students shouldn't use it and points teachers to a separate TTS tool. ReadEasy owns the whole loop: upload → level → verify → publish → read with support, from one link.

**"MagicSchool has student rooms with read-aloud."** Those rooms create student records (names) and sit in a category Common Sense Media rates "Moderate Risk". ReadEasy exposes no AI to students and keeps no student data at all. That's the procurement story.

**"Immersive Reader is free in every Microsoft school."** It restyles text; it can't level it, check comprehension, or read a photographed worksheet (PDFs only get read-aloud). ReadEasy works alongside it: it makes the content IR has nothing to read.

**"AI rewrites change meaning. How do you stop that?"** We agree it does: EdWeek reported six leveling tools, Diffit included, writing above the requested grade and drifting meaning. Our answer is structural: a mandatory review with the original side by side, Fact Guard verification of every rewrite against the source, flags that must be acknowledged, and the original always available to students.

**"How is student privacy handled?"** No student accounts, names, or analytics. Preferences and progress stay in the device's local storage. Links are 128-bit unguessable tokens, marked noindex, rate-limited, and can be rotated. Uploaded content goes only to the AI call and is never logged. The teacher side stores only the email, classes, materials, and generated content. See PRIVACY.md.
