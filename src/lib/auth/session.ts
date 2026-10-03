import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { hasSupabase, publicEnv, serverEnv } from "@/lib/env";

export type Session = { sub: string; email: string };

export const SESSION_COOKIE = "readeasy_session";

function secret(): string {
  const s = serverEnv().DRAFT_COOKIE_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production" && !publicEnv.NEXT_PUBLIC_DEV_TOOLS) {
    throw new Error("DRAFT_COOKIE_SECRET must be set (32+ random characters) in production.");
  }
  return "dev-only-secret-change-me";
}

export function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function verifySigned(value: string | undefined): string | null {
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx < 1) return null;
  const payload = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? payload : null;
}

// Who is signed in. Supabase Auth when configured; otherwise the signed cookie
// set by the simple email sign-in.
export async function getSession(): Promise<Session | null> {
  if (hasSupabase()) {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return null;
    return { sub: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
  }
  const store = await cookies();
  const payload = verifySigned(store.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as Partial<Session>;
    if (typeof parsed.sub === "string" && typeof parsed.email === "string") return { sub: parsed.sub, email: parsed.email };
  } catch {
    /* fall through */
  }
  return null;
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHENTICATED");
  return s;
}
