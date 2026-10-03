// Accessibility audit of every screen with axe-core. Fails on serious/critical issues.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { existsSync } from "node:fs";

const base = process.env.BASE_URL ?? "http://localhost:3100";
const exe = process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const browser = await chromium.launch(exe && existsSync(exe) ? { executablePath: exe } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
let failures = 0;

async function audit(name) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const minor = results.violations.filter((v) => v.impact !== "serious" && v.impact !== "critical");
  console.log(`${bad.length ? "FAIL" : "ok  "} ${name}: ${bad.length} serious/critical, ${minor.length} minor`);
  for (const v of bad) { failures++; console.log(`   - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes) e.g. ${v.nodes[0]?.html?.slice(0, 120)}`); }
  for (const v of minor) console.log(`     (${v.impact}) ${v.id}: ${v.nodes.length} nodes`);
}

await page.goto(`${base}/`); await audit("landing");
await page.getByRole("button", { name: "History passage" }).click(); await page.waitForTimeout(400); await audit("landing (sample switched)");
await page.locator("textarea").fill("Water moves between the ocean, the air, and the land in a cycle. Evaporation turns liquid water into vapor. Condensation forms clouds. Precipitation brings it back down to the ground. About 97% of Earth's water is in the oceans. Only about 3% is fresh water, and most of that is ice. Rivers carry water back to the sea, and the cycle begins again.");
await page.getByRole("button", { name: "Make it readable" }).click();
await page.waitForURL(/review/); await page.getByText("Before", { exact: true }).first().waitFor({ timeout: 60000 }); await audit("review (signed out)");
await page.getByRole("link", { name: "Sign in to publish" }).click(); await audit("sign in");
await page.getByLabel("Email").fill("judge@example.edu"); await page.getByRole("button", { name: "Sign in" }).click(); await page.waitForURL(/review/); await audit("review (signed in)");
if (await page.getByLabel("Class name").count()) { await page.getByLabel("Class name").fill("Judge Class"); await page.getByRole("button", { name: "Create class link" }).click(); await page.getByRole("button", { name: "Publish", exact: true }).waitFor(); }
await page.getByRole("button", { name: "Publish", exact: true }).click(); await page.getByRole("heading", { name: "Published" }).waitFor(); await audit("review (published)");
const link = await page.locator("a[href*='/r/']").first().getAttribute("href");
await page.goto(`${base}/dashboard`); await audit("dashboard");
await page.goto(`${base}/c/judge-class`); await audit("class page");
await page.goto(link.startsWith("http") ? link : base + link); await audit("reader (words to know)");
await page.getByRole("button", { name: "Start reading" }).click(); await audit("reader");
await page.getByRole("button", { name: "Reading settings" }).click(); await page.waitForTimeout(500); await audit("reader (settings open)"); await page.keyboard.press("Escape");
await page.goto(`${base}/qr/judge-class`); await audit("qr");
await page.goto(`${base}/go`); await audit("class code");
await page.goto(`${base}/privacy`); await audit("privacy");
await page.goto(`${base}/r/not-a-real-token-at-all`); await audit("dead link");
await page.goto(`${base}/nope`); await audit("404");
await browser.close();
if (failures) { console.log(`\n${failures} serious/critical accessibility issues`); process.exit(1); }
console.log("\nAXE PASSED");
