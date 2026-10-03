import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { authMode } from "@/lib/env";
import { withDb } from "@/lib/db";
import { SESSION_COOKIE, sign } from "@/lib/auth/session";
import { claimDraftAfterSignIn, safeNext } from "@/lib/auth/actions";
import { enforceRateLimit } from "@/lib/limits";
import { getClientIp } from "@/lib/api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Simple sign-in: an email is the whole account. Used when Supabase Auth is
// not configured (hackathon and demo deployments). Nothing sensitive lives
// behind it: materials and class links only.
async function signIn(request: NextRequest, email: string, next: string) {
  if (authMode() !== "simple") {
    return NextResponse.json({ error: { code: "not_found", message: "Not available." } }, { status: 404 });
  }
  const clean = email.trim().toLowerCase();
  if (!EMAIL.test(clean)) {
    return NextResponse.redirect(new URL(`/auth/signin?error=email&next=${encodeURIComponent(safeNext(next))}`, request.nextUrl.origin), { status: 303 });
  }
  await enforceRateLimit(`signin:${getClientIp(request)}`, 60, 600, "Too many sign-in attempts. Wait a few minutes.");
  const sub = await withDb({ role: "service" }, async (q) => {
    const existing = await q<{ id: string }>("select id from teachers where email = $1", [clean]);
    if (existing.rows[0]) return existing.rows[0].id;
    const created = await q<{ id: string }>("insert into teachers (email) values ($1) on conflict (email) do update set email = excluded.email returning id", [clean]);
    return created.rows[0]!.id;
  });
  const payload = JSON.stringify({ sub, email: clean });
  const store = await cookies();
  store.set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  const claimed = await claimDraftAfterSignIn(sub);
  const dest = claimed ? `/materials/${claimed}/review?claimed=1` : safeNext(next);
  return NextResponse.redirect(new URL(dest, request.nextUrl.origin), { status: 303 });
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  return signIn(request, String(form?.get("email") ?? ""), String(form?.get("next") ?? "/dashboard"));
}

export async function GET(request: NextRequest) {
  return signIn(request, request.nextUrl.searchParams.get("email") ?? "", request.nextUrl.searchParams.get("next") ?? "/dashboard");
}
