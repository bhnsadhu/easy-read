import { afterEach, describe, expect, it, vi } from "vitest";

// Copying .env.example leaves values blank ("DAILY_GENERATION_CAP="); those must read as unset.
describe("env parsing", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    vi.resetModules();
  });

  it("treats blank values as defaults, not empty strings", async () => {
    process.env.DAILY_GENERATION_CAP = "";
    process.env.MAX_UPLOAD_MB = "";
    process.env.DATABASE_URL = "";
    process.env.ANTHROPIC_API_KEY = "";
    process.env.NEXT_PUBLIC_APP_URL = "";
    vi.resetModules();
    const env = await import("@/lib/env");
    expect(env.serverEnv().DAILY_GENERATION_CAP).toBe(40);
    expect(env.serverEnv().MAX_UPLOAD_MB).toBe(25);
    expect(env.isMockDb()).toBe(true);
    expect(env.isMockLlm()).toBe(true);
    expect(env.publicEnv.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });
});
