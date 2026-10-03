import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;
// The sandbox ships one Chromium at a fixed path; CI installs the matching build.
const localChromium = process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const chromiumLaunch = !process.env.CI && existsSync(localChromium) ? { executablePath: localChromium } : {};
const allBrowsers = process.env.CI === "true" || process.env.PW_ALL_BROWSERS === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      MOCK_LLM: "1",
      NEXT_PUBLIC_DEV_TOOLS: "1",
      NEXT_PUBLIC_APP_URL: baseURL,
    },
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], launchOptions: chromiumLaunch } },
    { name: "chromium-chromebook", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 }, launchOptions: chromiumLaunch } },
    { name: "chromium-phone", use: { ...devices["Pixel 7"], launchOptions: chromiumLaunch } },
    ...(allBrowsers
      ? [
          { name: "webkit-ipad", use: { ...devices["iPad (gen 7)"] } },
          { name: "webkit-iphone", use: { ...devices["iPhone 14"] } },
          { name: "firefox-desktop", use: { ...devices["Desktop Firefox"] } },
        ]
      : []),
  ],
});
