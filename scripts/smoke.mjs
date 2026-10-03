// End-to-end smoke test against a running server: teacher flow then student flow.
import { chromium } from "@playwright/test";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";

const base = process.env.BASE_URL ?? "http://localhost:3100";
const exe = process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
mkdirSync("test-shots", { recursive: true });
const browser = await chromium.launch(exe && existsSync(exe) ? { executablePath: exe } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });

// Fake speech synthesis so read-aloud can be exercised headlessly.
await ctx.addInitScript(() => {
  class U { constructor(t) { this.text = t; this.rate = 1; this.lang = "en"; } }
  const voices = [{ voiceURI: "fake-en", name: "Fake English", lang: "en-US", localService: true, default: true }];
  let current = null;
  Object.defineProperty(window, "SpeechSynthesisUtterance", { value: U, configurable: true });
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
    speaking: false, paused: false,
    getVoices: () => voices,
    addEventListener() {}, removeEventListener() {},
    speak(u) { current = u; this.speaking = true; setTimeout(() => { u.onboundary?.({ name: "word", charIndex: 0, charLength: 2 }); }, 10); setTimeout(() => { if (current === u) { this.speaking = false; u.onend?.({}); } }, 60); },
    cancel() { current = null; this.speaking = false; },
    pause() { this.paused = true; }, resume() { this.paused = false; },
  } });
});

const step = async (name, fn) => { try { await fn(); console.log("ok  ", name); } catch (e) { console.log("FAIL", name, e.message); await page.screenshot({ path: `test-shots/fail-${name.replace(/\W+/g, "-")}.png` }); throw e; } };

await step("landing", async () => { await page.goto(base); await page.getByRole("heading", { level: 1 }).waitFor(); await page.screenshot({ path: "test-shots/01-landing.png", fullPage: true }); });
await step("upload a PDF and extract text", async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pg = pdf.addPage([612, 792]);
  const lines = ["The water cycle", "", "Water moves between the ocean, the air, and the land in a cycle.", "In 1674, Pierre Perrault measured rainfall in the Seine basin and showed that rain could feed rivers.", "About 97% of Earth's water is in the oceans. Only about 3% is fresh water, and most of that is ice.", "Evaporation turns liquid water into vapor. Condensation forms clouds. Precipitation brings it back down."];
  lines.forEach((l, i) => pg.drawText(l, { x: 50, y: 740 - i * 20, size: 12, font }));
  const bytes = await pdf.save();
  writeFileSync("test-shots/sample.pdf", bytes);
  await page.getByRole("button", { name: "Upload a file" }).waitFor();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Upload a file" }).click()]);
  await chooser.setFiles("test-shots/sample.pdf");
  await page.waitForFunction(() => (document.querySelector("textarea")?.value ?? "").includes("Pierre Perrault"), null, { timeout: 30000 });
});
await step("paste sample and submit", async () => { await page.getByRole("button", { name: "Use a sample reading" }).click(); await page.getByRole("button", { name: "Make it readable" }).click(); await page.waitForURL(/\/materials\/.+\/review/, { timeout: 30000 }); });
await step("processing completes", async () => { await page.getByRole("heading", { name: /Photosynthesis|Untitled|Reading/ }).waitFor(); await page.getByText("Before", { exact: true }).first().waitFor({ timeout: 60000 }); await page.screenshot({ path: "test-shots/02-review.png", fullPage: true }); });
await step("fact guard verdict shown", async () => { await page.getByText(/Fact Guard (checked|:)/).first().waitFor({ timeout: 10000 }); });
await step("sign in (dev)", async () => { await page.getByRole("link", { name: "Sign in to publish" }).click(); await page.getByLabel("Email").fill("teacher@example.edu"); await page.getByRole("button", { name: "Sign in" }).click(); await page.waitForURL(/\/materials\/.+\/review/); });
await step("acknowledge flags", async () => { while (await page.getByRole("button", { name: "Keep original here" }).count()) { await page.getByRole("button", { name: "Keep original here" }).first().click(); await page.waitForTimeout(600); } });
await step("create class and publish", async () => { if (await page.getByLabel("Class name").count()) { await page.getByLabel("Class name").fill("Ms. Rivera's 7th grade science"); await page.getByRole("button", { name: "Create class link" }).click(); } await page.getByRole("button", { name: "Publish", exact: true }).waitFor({ timeout: 15000 }); await page.getByRole("button", { name: "Publish", exact: true }).click(); await page.getByRole("heading", { name: "Published" }).waitFor({ timeout: 15000 }); await page.screenshot({ path: "test-shots/03-published.png", fullPage: true }); });
let studentUrl;
await step("student link", async () => { studentUrl = await page.locator("a[href*='/r/']").first().getAttribute("href"); if (!studentUrl) throw new Error("no link"); });
await step("class page", async () => { await page.goto(`${base}/c/ms-riveras-7th-grade-science`); await page.getByRole("link", { name: /Read/ }).first().waitFor(); await page.screenshot({ path: "test-shots/04-class.png", fullPage: true }); });
const student = await ctx.newPage();
student.on("pageerror", (e) => errors.push(`student pageerror: ${e.message}`));
await step("reader loads", async () => { await student.goto(studentUrl.startsWith("http") ? studentUrl : base + studentUrl); await student.getByRole("heading", { name: "Words to know" }).waitFor(); await student.screenshot({ path: "test-shots/05-reader-words.png", fullPage: true }); await student.getByRole("button", { name: "Start reading" }).click(); });
await step("read aloud highlights", async () => { await student.getByRole("button", { name: "Listen" }).click(); await student.locator(".bg-highlight").first().waitFor({ timeout: 5000 }); await student.screenshot({ path: "test-shots/06-reader-playing.png" }); });
await step("level switch", async () => { await student.getByRole("button", { name: "Simple" }).click(); await student.getByRole("button", { name: "Original" }).click(); });
await step("settings sheet", async () => { await student.getByRole("button", { name: "Reading settings" }).click(); await student.getByRole("button", { name: "Pale blue" }).click(); await student.getByRole("button", { name: "OpenDyslexic" }).click(); await student.screenshot({ path: "test-shots/07-settings.png" }); await student.keyboard.press("Escape"); });
await step("tap a word", async () => { await student.locator("[data-word='photosynthesis.'], [data-word='photosynthesis'], [data-word='Photosynthesis']").first().click(); await student.getByRole("dialog", { name: /^Word: / }).waitFor({ timeout: 5000 }); const title = await student.getByRole("dialog", { name: /^Word: / }).getAttribute("aria-label"); if (!/^Word: \w+$/.test(title ?? "")) throw new Error(`punctuation leaked: ${title}`); await student.screenshot({ path: "test-shots/08-word.png" }); });
await step("qr page", async () => { await page.goto(`${base}/qr/ms-riveras-7th-grade-science`); await page.getByRole("img", { name: /QR code/ }).first().waitFor(); await page.screenshot({ path: "test-shots/09-qr.png" }); });
await step("dashboard", async () => { await page.goto(`${base}/dashboard`); await page.getByRole("heading", { name: "Your classes" }).waitFor(); await page.screenshot({ path: "test-shots/10-dashboard.png", fullPage: true }); });
await step("dead link", async () => { await page.goto(`${base}/r/nope-nope-nope-nope-nope`); await page.getByText("Ask your teacher for the new link.").waitFor(); });
await browser.close();
if (errors.length) { console.log("Browser errors:\n" + errors.join("\n")); process.exit(1); }
console.log("SMOKE PASSED");
