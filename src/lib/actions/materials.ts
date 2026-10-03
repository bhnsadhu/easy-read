"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { resolveOwner } from "@/lib/auth/owner";
import { getClass } from "@/lib/data/classes";
import {
  deleteMaterial as deleteMaterialRow,
  deleteSection as deleteSectionRow,
  duplicateMaterial,
  getMaterialWithSections,
  reorderMaterials as reorderRows,
  resetSectionForRegenerate,
  rotateShareToken,
  updateMaterial,
  updateSection,
  type Owner,
} from "@/lib/data/materials";
import { invalidateMaterial } from "@/lib/data/public-cached";
import { ConflictError, NotFoundError, type Supports } from "@/lib/data/types";
import { sectionContent, type QuickCheck } from "@/lib/content/types";
import { sanitizeContent, validateQuickCheck } from "@/lib/text";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; code: string; message: string };

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, code, message };
}

function mapError(err: unknown): ActionResult<never> {
  if (err instanceof ConflictError) return fail("conflict", "This was changed in another tab. Reload to see the latest version before editing.");
  if (err instanceof NotFoundError) return fail("not_found", "We couldn't find that. It may have been removed.");
  if (err instanceof Error && err.message === "UNAUTHENTICATED") return fail("unauthenticated", "Sign in to continue.");
  console.error("[action]", err instanceof Error ? { name: err.name, message: err.message } : err);
  return fail("internal", "Something went wrong on our side. Try again in a moment.");
}

async function owner(): Promise<Owner> {
  const o = await resolveOwner();
  if (!o) throw new Error("UNAUTHENTICATED");
  return o;
}

async function teacher(): Promise<string> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHENTICATED");
  return s.sub;
}

async function classHandle(classId: string | null, sub: string): Promise<string | null> {
  if (!classId) return null;
  try {
    return (await getClass(sub, classId)).handle;
  } catch {
    return null;
  }
}

export async function publishMaterial(materialId: string): Promise<ActionResult<{ token: string; handle: string }>> {
  try {
    const sub = await teacher();
    const { material, sections } = await getMaterialWithSections({ kind: "teacher", sub }, materialId);
    if (!material.class_id) return fail("no_class", "Choose a class first, so students know where to find it.");
    if (material.status === "processing") return fail("processing", "Still adapting. Publish when every section is done.");
    const unacknowledged = sections.filter((s) => s.status === "flagged" && !s.fact_guard.acknowledged);
    if (unacknowledged.length) {
      return fail("flags", `${unacknowledged.length} ${unacknowledged.length === 1 ? "section needs" : "sections need"} a check before publishing.`);
    }
    if (!sections.some((s) => s.status === "done" || s.status === "flagged")) return fail("empty", "There's nothing to publish yet.");
    await updateMaterial({ kind: "teacher", sub }, materialId, { status: "published" }, material.version);
    const handle = await classHandle(material.class_id, sub);
    invalidateMaterial(material.share_token, handle);
    revalidatePath("/dashboard");
    return { ok: true, data: { token: material.share_token, handle: handle ?? "" } };
  } catch (err) {
    return mapError(err);
  }
}

export async function unpublishMaterial(materialId: string): Promise<ActionResult> {
  try {
    const sub = await teacher();
    const { material } = await getMaterialWithSections({ kind: "teacher", sub }, materialId);
    if (material.status !== "published") return { ok: true };
    await updateMaterial({ kind: "teacher", sub }, materialId, { status: "draft" });
    invalidateMaterial(material.share_token, await classHandle(material.class_id, sub));
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function rotateMaterialLink(materialId: string): Promise<ActionResult<{ token: string }>> {
  try {
    const sub = await teacher();
    const before = await getMaterialWithSections({ kind: "teacher", sub }, materialId);
    const after = await rotateShareToken(sub, materialId);
    invalidateMaterial(before.material.share_token, await classHandle(after.class_id, sub));
    revalidatePath("/dashboard");
    return { ok: true, data: { token: after.share_token } };
  } catch (err) {
    return mapError(err);
  }
}

export async function reorderClassMaterials(classId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    const sub = await teacher();
    const ids = z.array(z.string().uuid()).max(500).parse(orderedIds);
    await reorderRows(sub, classId, ids);
    invalidateMaterial("", await classHandle(classId, sub));
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function duplicateMaterialToClass(materialId: string, targetClassId: string | null): Promise<ActionResult<{ id: string }>> {
  try {
    const sub = await teacher();
    const copy = await duplicateMaterial(sub, materialId, targetClassId);
    revalidatePath("/dashboard");
    return { ok: true, data: { id: copy.id } };
  } catch (err) {
    return mapError(err);
  }
}

export async function deleteMaterial(materialId: string): Promise<ActionResult> {
  try {
    const o = await owner();
    const { material } = await getMaterialWithSections(o, materialId);
    await deleteMaterialRow(o, materialId);
    if (o.kind === "teacher") invalidateMaterial(material.share_token, await classHandle(material.class_id, o.sub));
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

const metaSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  classId: z.string().uuid().nullable().optional(),
  supports: z
    .object({ levels: z.array(z.enum(["medium", "simple"])), tldr: z.boolean(), words: z.boolean(), quick_checks: z.boolean(), steps: z.boolean() })
    .optional(),
  tldr: z.array(z.string().trim().min(1).max(240)).max(3).nullable().optional(),
  assignmentSteps: z.array(z.string().trim().min(1).max(240)).max(30).nullable().optional(),
  wordPreview: z
    .array(z.object({ word: z.string().min(1).max(60), syllables: z.array(z.string().min(1)).min(1), definition: z.string().max(300).nullable(), example: z.string().max(400).nullable() }))
    .max(8)
    .nullable()
    .optional(),
});

export async function updateMaterialMeta(materialId: string, patch: z.input<typeof metaSchema>, expectedVersion?: number): Promise<ActionResult<{ version: number }>> {
  try {
    const o = await owner();
    const p = metaSchema.parse(patch);
    const row = await updateMaterial(
      o,
      materialId,
      {
        ...(p.title !== undefined ? { title: p.title } : {}),
        ...(p.classId !== undefined && o.kind === "teacher" ? { classId: p.classId } : {}),
        ...(p.supports !== undefined ? { supports: p.supports as Supports } : {}),
        ...(p.tldr !== undefined ? { tldr: p.tldr } : {}),
        ...(p.assignmentSteps !== undefined ? { assignmentSteps: p.assignmentSteps } : {}),
        ...(p.wordPreview !== undefined ? { wordPreview: p.wordPreview } : {}),
      },
      expectedVersion,
    );
    if (o.kind === "teacher") invalidateMaterial(row.share_token, await classHandle(row.class_id, o.sub));
    revalidatePath("/dashboard");
    return { ok: true, data: { version: row.version } };
  } catch (err) {
    if (err instanceof z.ZodError) return fail("invalid", "Some of that didn't look right. Check the fields and try again.");
    return mapError(err);
  }
}

const sectionPatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  about: z.string().trim().min(1).max(200).optional(),
  level: z.enum(["original", "medium", "simple"]).optional(),
  content: sectionContent.optional(),
  quickChecks: z
    .array(z.object({ id: z.string(), question: z.string().trim().min(1).max(400), options: z.array(z.string().trim().min(1).max(200)).min(2).max(4), answerIndex: z.number().int().min(0).max(3) }))
    .max(2)
    .optional(),
});

export async function saveSectionEdit(materialId: string, sectionId: string, patch: z.input<typeof sectionPatchSchema>, expectedVersion: number): Promise<ActionResult<{ version: number }>> {
  try {
    const o = await owner();
    const p = sectionPatchSchema.parse(patch);
    const { material, sections } = await getMaterialWithSections(o, materialId);
    const current = sections.find((s) => s.id === sectionId);
    if (!current) return fail("not_found", "That section no longer exists.");

    const update: Parameters<typeof updateSection>[3] = {};
    if (p.title !== undefined) update.title = p.title;
    if (p.about !== undefined) update.about = p.about;
    if (p.content !== undefined && p.level) {
      const safe = sanitizeContent(p.content);
      if (p.level === "original") update.original = safe;
      else update.levels = { ...current.levels, [p.level]: safe };
    }
    if (p.quickChecks !== undefined) {
      const base = update.original ?? current.original;
      update.quickChecks = p.quickChecks.map((qc) => validateQuickCheck(base, qc) as QuickCheck);
    }
    const row = await updateSection(o, materialId, sectionId, update, expectedVersion);
    if (o.kind === "teacher") invalidateMaterial(material.share_token, await classHandle(material.class_id, o.sub));
    return { ok: true, data: { version: row.version } };
  } catch (err) {
    if (err instanceof z.ZodError) return fail("invalid", "Some of that didn't look right. Check the text and try again.");
    return mapError(err);
  }
}

export async function acknowledgeFactGuard(materialId: string, sectionId: string, expectedVersion: number): Promise<ActionResult<{ version: number }>> {
  try {
    const o = await owner();
    const { material, sections } = await getMaterialWithSections(o, materialId);
    const current = sections.find((s) => s.id === sectionId);
    if (!current) return fail("not_found", "That section no longer exists.");
    const row = await updateSection(o, materialId, sectionId, { factGuard: { ...current.fact_guard, acknowledged: true } }, expectedVersion);
    const remaining = sections.filter((s) => s.id !== sectionId && s.status === "flagged" && !s.fact_guard.acknowledged).length;
    if (remaining === 0 && material.status === "needs_review") await updateMaterial(o, materialId, { status: "draft" });
    revalidatePath("/dashboard");
    return { ok: true, data: { version: row.version } };
  } catch (err) {
    return mapError(err);
  }
}

export async function regenerateSection(materialId: string, sectionId: string): Promise<ActionResult> {
  try {
    const o = await owner();
    await resetSectionForRegenerate(o, materialId, sectionId);
    await updateMaterial(o, materialId, { status: "processing" });
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function removeSection(materialId: string, sectionId: string): Promise<ActionResult> {
  try {
    const o = await owner();
    const { material } = await getMaterialWithSections(o, materialId);
    await deleteSectionRow(o, materialId, sectionId);
    if (o.kind === "teacher") invalidateMaterial(material.share_token, await classHandle(material.class_id, o.sub));
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}
