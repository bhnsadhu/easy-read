import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { hasSupabase, publicEnv } from "@/lib/env";
import { withDb } from "@/lib/db";
import { MOCK_SESSION_COOKIE, sign } from "@/lib/auth/session";
import { claimDraftAfterSignIn, safeNext } from "@/lib/auth/actions";

// Test and local-dev sign-in. Only exists when dev tools are on and no real
// auth provider is configured; never reachable in production.
async function signIn(request: NextRequest, email: string, next: string) {
  if (!publicEnv.NEXT_PUBLIC_DEV_TOOLS || hasSupabase()) {
    return NextResponse.json({ error: { code: "not_found", message: "Not available." } }, { status: 404 });
  }
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
    return NextResponse.json({ error: { code: "bad_request", message: "Enter an email address." } }, { status: 400 });
  }
  const sub = await withDb({ role: "service" }, async (q) => {
    const existing = await q<{ id: string }>("select id from auth.users where email = $1", [clean]);
    if (existing.rows[0]) return existing.rows[0].id;
    const created = await q<{ id: string }>("insert into auth.users (email) values ($1) returning id", [clean]);
    return created.rows[0]!.id;
  });
  const payload = JSON.stringify({ sub, email: clean });
  const store = await cookies();
  store.set(MOCK_SESSION_COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  const claimed = await claimDraftAfterSignIn(sub);
  const dest = claimed ? `/materials/${claimed}/review?claimed=1` : safeNext(next);
  return NextResponse.redirect(new URL(dest, request.nextUrl.origin), { status: 303 });
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const email = String(form?.get("email") ?? "");
  const next = String(form?.get("next") ?? "/dashboard");
  return signIn(request, email, next);
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") ?? "";
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  return signIn(request, email, next);
}
