import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { sign, verifySigned } from "./session";

export const DRAFT_COOKIE = "readeasy_draft";
const MAX_AGE = 60 * 60 * 24 * 7;

// Anonymous "try it" sessions are identified by a signed, httpOnly cookie.
// The token is the only key to their draft material until they sign in.
export async function getDraftToken(): Promise<string | null> {
  const store = await cookies();
  return verifySigned(store.get(DRAFT_COOKIE)?.value);
}

export async function ensureDraftToken(): Promise<string> {
  const existing = await getDraftToken();
  if (existing) return existing;
  const token = `draft_${randomBytes(16).toString("base64url")}`;
  const store = await cookies();
  store.set(DRAFT_COOKIE, `${token}.${sign(token)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return token;
}

export async function clearDraftToken(): Promise<void> {
  const store = await cookies();
  store.delete(DRAFT_COOKIE);
}
