import "server-only";
import { hasSupabase, publicEnv } from "@/lib/env";
import { claimDraft } from "@/lib/data/materials";
import { clearDraftToken, getDraftToken } from "./draft";

export type SignInResult = { ok: true } | { ok: false; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function requestMagicLink(email: string, next: string): Promise<SignInResult> {
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) return { ok: false, message: "That doesn't look like an email address. Check it and try again." };
  if (!hasSupabase()) {
    return { ok: false, message: "Email sign-in isn't set up on this server yet. Use the dev sign-in instead." };
  }
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const redirect = new URL("/auth/confirm", publicEnv.NEXT_PUBLIC_APP_URL);
  redirect.searchParams.set("next", safeNext(next));
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { emailRedirectTo: redirect.toString(), shouldCreateUser: true },
  });
  if (error) {
    const rate = /rate|too many|429/i.test(error.message);
    return {
      ok: false,
      message: rate ? "We just sent you a link. Check your inbox (and spam), or try again in a minute." : "We couldn't send the link. Check the address and try again.",
    };
  }
  return { ok: true };
}

// Prevents open redirects: only same-origin paths are allowed.
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) return "/dashboard";
  return next.slice(0, 500);
}

// After any successful sign-in: the anonymous draft (if any) becomes theirs.
export async function claimDraftAfterSignIn(sub: string): Promise<string | null> {
  const token = await getDraftToken();
  if (!token) return null;
  const id = await claimDraft(sub, token);
  await clearDraftToken();
  return id;
}
