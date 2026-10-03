import { NextResponse, type NextRequest } from "next/server";
import { claimDraftAfterSignIn, safeNext } from "@/lib/auth/actions";
import { hasSupabase } from "@/lib/env";

// Magic-link landing. The email template links here with a token_hash, which
// works even when the link is opened on a different device than the one that
// requested it (no PKCE verifier needed).
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNext(url.searchParams.get("next"));
  const fail = (reason: string) => NextResponse.redirect(new URL(`/auth/signin?error=${reason}&next=${encodeURIComponent(next)}`, url.origin));

  if (!hasSupabase() || !tokenHash || (type !== "email" && type !== "magiclink")) return fail("invalid");

  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (error || !data.user) return fail("expired");

  const claimed = await claimDraftAfterSignIn(data.user.id);
  const dest = claimed ? `/materials/${claimed}/review?claimed=1` : next;
  return NextResponse.redirect(new URL(dest, url.origin));
}
