# Demo script (2 minutes)

## Before you start

- Open the deployed URL on a laptop and keep your phone unlocked with the camera ready.
- Confirm `/api/health` returns `ok: true` with `db: postgres`.
- Sign in once beforehand (simple email sign-in) and have a class created already ("Ms. Rivera's 7th grade science").
- Have a messy handout ready: a PDF or a phone photo of a worksheet. The four sample buttons on the landing page are the fallback.
- Turn the laptop volume up. Test one sentence of read-aloud in the browser you'll use (Chrome or Safari).

## Script

1. **The problem (10 s).** "One in five students can't get through a dense handout. The teacher has five minutes between periods."
2. **Before/After (30 s).** Landing page → click **Science article**. Left is the handout; right is ReadEasy. Press **Listen**: the sentence lights up. Click **OpenDyslexic** and **A+** to show the reading settings change live. Switch to **Simple**.
3. **Your own material (20 s).** Scroll down → **Upload a file** → the PDF or photo. The extracted text appears. Click **Make it readable**. Sections appear one by one with a grade estimate per level and the green **Fact Guard** line: "every number, date, name, and key term from the original is in the rewrite." Say: "Every rewrite is checked against the original. If anything were missing we'd keep the original wording and show the teacher exactly what was dropped."
4. **Publish (10 s).** Click **Publish**. Click **QR for projector**.
5. **Student (40 s).** Scan the QR with the phone. Class page → tap the material. "Words to know" with play buttons; tap one. Tap **Start reading**, then the big play button: the sentence lights up as it's read. Tap another sentence to jump. Tap a word: hear it, see syllables and the definition. Open **Reading settings**: switch to OpenDyslexic, widen the spacing, pick pale blue. Switch level to **Simple**, then back to **Original**.
6. **Close (10 s).** "No student accounts, no tracking. One link per class. The original is always one tap away."

## The five hardest questions

**"Isn't this Diffit plus Immersive Reader?"** Those are two products with a copy-paste in between; Diffit's own support page says students shouldn't use it and points teachers to a separate TTS tool. ReadEasy owns the whole loop: upload → level → verify → publish → read with support, from one link.

**"MagicSchool has student rooms with read-aloud."** Those rooms create student records (names) and sit in a category Common Sense Media rates "Moderate Risk". ReadEasy exposes no AI to students and keeps no student data at all. That's the procurement story.

**"Immersive Reader is free in every Microsoft school."** It restyles text; it can't level it, check comprehension, or read a photographed worksheet (PDFs only get read-aloud). ReadEasy works alongside it: it makes the content IR has nothing to read.

**"AI rewrites change meaning. How do you stop that?"** We agree it does: EdWeek reported six leveling tools, Diffit included, writing above the requested grade and drifting meaning. Our answer is structural: a mandatory review with the original side by side, Fact Guard verification of every rewrite against the source, flags that must be acknowledged, and the original always available to students.

**"How is student privacy handled?"** No student accounts, names, or analytics. Preferences and progress stay in the device's local storage. Links are 128-bit unguessable tokens, marked noindex, rate-limited, and can be rotated. Uploaded content goes only to the AI call and is never logged. The teacher side stores only the email, classes, materials, and generated content. See PRIVACY.md.
