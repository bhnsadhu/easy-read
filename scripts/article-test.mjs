import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const article = readFileSync(process.env.ARTICLE, "utf8");

// Build a real multi-page PDF from the article (word-wrapped, paginated).
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.TimesRoman);
let page = pdf.addPage([612, 792]);
let y = 740;
const wrap = (line) => { const words = line.split(" "); const out = []; let cur = ""; for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (font.widthOfTextAtSize(t, 12) > 500) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; };
for (const para of article.split("\n")) {
  for (const l of (para.trim() ? wrap(para) : [""])) {
    if (y < 60) { page = pdf.addPage([612, 792]); y = 740; }
    if (l) page.drawText(l, { x: 56, y, size: 12, font });
    y -= 17;
  }
}
writeFileSync("test-shots/article.pdf", await pdf.save());
console.log("pdf pages:", pdf.getPageCount());

const exe = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));

// 1. Paste the article
await p.goto(base);
await p.locator("textarea").fill(article);
await p.getByRole("button", { name: "Make it readable" }).click();
await p.waitForURL(/\/materials\/.+\/review/, { timeout: 30000 });
await p.getByText("Before", { exact: true }).first().waitFor({ timeout: 90000 });
await p.waitForTimeout(500);
const sections = await p.locator("article").count();
const flags = await p.getByText(/Fact Guard:/).count();
const grades = await p.locator("text=/≈ grade/").allTextContents();
console.log("PASTE  sections:", sections, "| flagged:", flags, "| grades:", grades.slice(0, 4).join(" · "));
console.log("TL;DR:", (await p.locator("h2:has-text('TL;DR') + ul li").allTextContents()).join(" | "));
console.log("Words:", (await p.locator("h2:has-text('Words to know') + ul li").allTextContents()).slice(0, 8).join(" | "));
await p.screenshot({ path: "test-shots/11-article-review.png", fullPage: true });

// 2. Upload the PDF
await p.goto(base);
const [chooser] = await Promise.all([p.waitForEvent("filechooser"), p.getByRole("button", { name: "Upload a file" }).click()]);
await chooser.setFiles("test-shots/article.pdf");
await p.waitForFunction(() => (document.querySelector("textarea")?.value ?? "").includes("Honeybee Democracy"), null, { timeout: 30000 });
const extracted = await p.locator("textarea").inputValue();
console.log("PDF    extracted chars:", extracted.length, "| title field:", await p.getByLabel("Title").inputValue());
await p.getByRole("button", { name: "Make it readable" }).click();
await p.waitForURL(/\/materials\/.+\/review/, { timeout: 30000 });
await p.getByText("Before", { exact: true }).first().waitFor({ timeout: 90000 });
await p.waitForTimeout(500);
console.log("PDF    sections:", await p.locator("article").count(), "| flagged:", await p.getByText(/Fact Guard:/).count());
await p.screenshot({ path: "test-shots/12-pdf-review.png", fullPage: true });

// 3. Publish and read as a student
await p.getByRole("link", { name: "Sign in to publish" }).click();
await p.getByRole("button", { name: "Sign in" }).click();
await p.waitForURL(/\/materials\/.+\/review/);
while (await p.getByRole("button", { name: "Keep original here" }).count()) { await p.getByRole("button", { name: "Keep original here" }).first().click(); await p.waitForTimeout(500); }
if (await p.getByLabel("Class name").count()) { await p.getByLabel("Class name").fill("Mr. Ortiz Biology"); await p.getByRole("button", { name: "Create class link" }).click(); }
await p.getByRole("button", { name: "Publish", exact: true }).click();
await p.getByRole("heading", { name: "Published" }).waitFor({ timeout: 15000 });
const link = await p.locator("a[href*='/r/']").first().getAttribute("href");
const s = await ctx.newPage();
await s.goto(link.startsWith("http") ? link : base + link);
await s.getByRole("button", { name: "Start reading" }).click();
await s.getByRole("button", { name: "Simple" }).click();
await s.screenshot({ path: "test-shots/13-pdf-reader-simple.png", fullPage: false });
console.log("READER sentences:", await s.locator("[data-sentence]").count());
await browser.close();
if (errors.length) { console.log("PAGE ERRORS:", errors); process.exit(1); }
console.log("ARTICLE TEST PASSED");
