"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClass, deleteClass as deleteClassRow, isHandleAvailable, updateClass } from "@/lib/data/classes";
import { HANDLE_RE, normalizeHandle } from "@/lib/handles";
import { invalidateClass } from "@/lib/data/public-cached";
import { ConflictError, NotFoundError } from "@/lib/data/types";
import { classThemes } from "@/lib/brand";
import type { ActionResult } from "./materials";

const classSchema = z.object({
  name: z.string().trim().min(1, "Give the class a name.").max(80, "Keep the name under 80 characters."),
  gradeBand: z.enum(["3-5", "6-8", "9-12"]),
  handle: z.string().trim().min(3).max(40),
  theme: z.enum(classThemes),
  welcome: z.string().trim().max(160, "Keep the welcome line under 160 characters.").nullable().optional(),
});

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, code, message };
}

async function teacher(): Promise<string> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHENTICATED");
  return s.sub;
}

function mapError(err: unknown): ActionResult<never> {
  if (err instanceof z.ZodError) return fail("invalid", err.issues[0]?.message ?? "Check the fields and try again.");
  if (err instanceof ConflictError) return fail("conflict", "This class was changed in another tab. Reload and try again.");
  if (err instanceof NotFoundError) return fail("not_found", "We couldn't find that class.");
  if (err instanceof Error && err.message === "UNAUTHENTICATED") return fail("unauthenticated", "Sign in to continue.");
  if (err instanceof Error && /duplicate|unique/i.test(err.message)) return fail("handle_taken", "That link is taken. Try another.");
  if (err instanceof Error && /check constraint/i.test(err.message)) return fail("handle_invalid", "Links use lowercase letters, numbers, and dashes (3–40 characters).");
  console.error("[action]", err instanceof Error ? { name: err.name, message: err.message } : err);
  return fail("internal", "Something went wrong on our side. Try again in a moment.");
}

export async function checkHandle(handle: string): Promise<{ handle: string; available: boolean; reason?: string }> {
  const sub = await getSession();
  const normalized = normalizeHandle(handle);
  if (!sub) return { handle: normalized, available: false, reason: "unauthenticated" };
  if (!HANDLE_RE.test(normalized)) return { handle: normalized, available: false, reason: "invalid" };
  const r = await isHandleAvailable(sub.sub, normalized);
  return { handle: normalized, ...r };
}

export async function createClassAction(input: z.input<typeof classSchema>): Promise<ActionResult<{ id: string; handle: string; code: string }>> {
  try {
    const sub = await teacher();
    const p = classSchema.parse({ ...input, handle: normalizeHandle(input.handle) });
    const row = await createClass(sub, { name: p.name, gradeBand: p.gradeBand, handle: p.handle, theme: p.theme, welcome: p.welcome ?? null });
    revalidatePath("/dashboard");
    return { ok: true, data: { id: row.id, handle: row.handle, code: row.code } };
  } catch (err) {
    return mapError(err);
  }
}

export async function updateClassAction(id: string, input: Partial<z.input<typeof classSchema>>, expectedVersion?: number): Promise<ActionResult<{ version: number; handle: string }>> {
  try {
    const sub = await teacher();
    const p = classSchema.partial().parse({ ...input, ...(input.handle !== undefined ? { handle: normalizeHandle(input.handle) } : {}) });
    const row = await updateClass(sub, id, { name: p.name, gradeBand: p.gradeBand, handle: p.handle, theme: p.theme, welcome: p.welcome }, expectedVersion);
    invalidateClass(row.handle);
    if (p.handle && p.handle !== row.handle) invalidateClass(p.handle);
    revalidatePath("/dashboard");
    return { ok: true, data: { version: row.version, handle: row.handle } };
  } catch (err) {
    return mapError(err);
  }
}

export async function deleteClassAction(id: string): Promise<ActionResult> {
  try {
    const sub = await teacher();
    await deleteClassRow(sub, id);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}
