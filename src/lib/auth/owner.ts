import "server-only";
import { getSession } from "./session";
import { getDraftToken } from "./draft";
import type { Owner } from "@/lib/data/materials";

// Resolves who is acting: a signed-in teacher wins; otherwise the draft cookie.
export async function resolveOwner(): Promise<Owner | null> {
  const session = await getSession();
  if (session) return { kind: "teacher", sub: session.sub };
  const draft = await getDraftToken();
  if (draft) return { kind: "draft", draftToken: draft };
  return null;
}
