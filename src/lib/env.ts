import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((v) => v === "1" || v === "true");

const serverSchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  MOCK_LLM: bool,
  MOCK_DB: bool,
  DATABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // 0 = no cap (hackathon default). Set a number in production if you want one.
  DAILY_GENERATION_CAP: z.coerce.number().int().min(0).default(0),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(25),
  TTS_PROVIDER: z.string().optional(),
  DRAFT_COOKIE_SECRET: z.string().optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_DEV_TOOLS: bool,
});

// Next.js only inlines NEXT_PUBLIC_* when referenced by full name.
const blank = (v: string | undefined) => (v && v.trim() !== "" ? v : undefined);

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: blank(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: blank(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  NEXT_PUBLIC_APP_URL: blank(process.env.NEXT_PUBLIC_APP_URL),
  NEXT_PUBLIC_DEV_TOOLS: blank(process.env.NEXT_PUBLIC_DEV_TOOLS),
});

let cachedServer: z.infer<typeof serverSchema> | null = null;

// Blank lines in .env files ("DATABASE_URL=") must read as unset, not "".
function withoutBlanks(env: NodeJS.ProcessEnv): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) if (v !== undefined && v.trim() !== "") out[k] = v;
  return out;
}

export function serverEnv() {
  if (cachedServer) return cachedServer;
  cachedServer = serverSchema.parse(withoutBlanks(process.env));
  return cachedServer;
}

export function hasSupabase(): boolean {
  return Boolean(publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Mock mode is on when explicitly requested or when no database is configured.
export function isMockDb(): boolean {
  const e = serverEnv();
  return e.MOCK_DB || !e.DATABASE_URL;
}

export function isMockLlm(): boolean {
  const e = serverEnv();
  return e.MOCK_LLM || !e.ANTHROPIC_API_KEY;
}
