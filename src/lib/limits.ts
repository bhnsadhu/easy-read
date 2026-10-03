import "server-only";
import { withDb } from "@/lib/db";
import { serverEnv } from "@/lib/env";

export class RateLimitedError extends Error {
  constructor(public userMessage: string, public retryAfterSeconds: number) {
    super("RATE_LIMITED");
    this.name = "RateLimitedError";
  }
}

const service = { role: "service" as const };

// Fixed windows stored in Postgres so every serverless instance shares them.
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number, message: string): Promise<void> {
  const r = await withDb(service, (q) => q<{ n: number }>("select bump_rate_limit($1, $2) as n", [key, windowSeconds]));
  const n = r.rows[0]?.n ?? 0;
  if (n > limit) throw new RateLimitedError(message, windowSeconds);
}

export async function enforceDailyGenerationCap(subject: string, capOverride?: number): Promise<void> {
  const cap = capOverride ?? serverEnv().DAILY_GENERATION_CAP;
  const r = await withDb(service, (q) => q<{ n: number }>("select bump_generation_usage($1) as n", [subject]));
  const n = r.rows[0]?.n ?? 0;
  if (n > cap) {
    throw new RateLimitedError(`You've reached today's limit of ${cap} new materials. It resets at midnight UTC.`, 3600);
  }
}

export const LIMITS = {
  anonIngestPerHour: 20,
  anonMaterialsPerDay: 3,
  teacherIngestPerHour: 60,
  studentPagePerMinute: 120,
  processCallsPerMinute: 120,
} as const;
