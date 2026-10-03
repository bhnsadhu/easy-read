"use server";

import { requestMagicLink as request, type SignInResult } from "@/lib/auth/actions";

export async function requestMagicLink(email: string, next: string): Promise<SignInResult> {
  return request(email, next);
}
