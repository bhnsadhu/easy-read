import "server-only";
import { withDb, type DbContext } from "@/lib/db";
import type { SectionDraft, WordPreviewEntry } from "@/lib/content/types";
import { ConflictError, NotFoundError, type MaterialRow, type MaterialStatus, type MaterialSummary, type SectionRow, type SourceType, type Supports } from "./types";

const teacher = (sub: string): DbContext => ({ role: "authenticated", sub });
const service: DbContext = { role: "service" };

// Who may touch a material: a signed-in owner, or the anonymous "try it"
// session that created it (identified by the httpOnly draft cookie).
export type Owner = { kind: "teacher"; sub: string } | { kind: "draft"; draftToken: string };

function ctxFor(owner: Owner): DbContext {
  return owner.kind === "teacher" ? teacher(owner.sub) : service;
}

function ownerClause(owner: Owner, params: unknown[]): string {
  if (owner.kind === "teacher") return "";
  params.push(owner.draftToken);
  return ` and draft_token = $${params.length} and teacher_id is null`;
}

export async function createMaterial(
  owner: Owner,
  input: {
    title: string;
    sourceType: SourceType;
    sourceName?: string | null;
    language: string;
    direction: "ltr" | "rtl";
    sourceText: string;
    contentHash: string;
    piiReport?: unknown;
    supports: Supports;
    classId?: string | null;
  },
): Promise<MaterialRow> {
  return withDb(ctxFor(owner), async (q) => {
    const r = await q<MaterialRow>(
      `insert into materials (teacher_id, draft_token, class_id, title, source_type, source_name, source_language, direction, source_text, content_hash, pii_report, supports, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft') returning *`,
      [
        owner.kind === "teacher" ? owner.sub : null,
        owner.kind === "draft" ? owner.draftToken : null,
        input.classId ?? null,
        input.title,
        input.sourceType,
        input.sourceName ?? null,
        input.language,
        input.direction,
        input.sourceText,
        input.contentHash,
        input.piiReport ? JSON.stringify(input.piiReport) : null,
        JSON.stringify(input.supports),
      ],
    );
    return r.rows[0]!;
  });
}

export async function getMaterial(owner: Owner, id: string): Promise<MaterialRow> {
  return withDb(ctxFor(owner), async (q) => {
    const params: unknown[] = [id];
    const r = await q<MaterialRow>(`select * from materials where id = $1${ownerClause(owner, params)}`, params);
    if (!r.rows[0]) throw new NotFoundError();
    return r.rows[0];
  });
}

export async function getMaterialWithSections(owner: Owner, id: string): Promise<{ material: MaterialRow; sections: SectionRow[] }> {
  return withDb(ctxFor(owner), async (q) => {
    const params: unknown[] = [id];
    const m = await q<MaterialRow>(`select * from materials where id = $1${ownerClause(owner, params)}`, params);
    if (!m.rows[0]) throw new NotFoundError();
    const s = await q<SectionRow>("select * from sections where material_id = $1 order by position", [id]);
    return { material: m.rows[0], sections: s.rows };
  });
}

export async function findDuplicate(sub: string, contentHash: string): Promise<MaterialRow | null> {
  return withDb(teacher(sub), async (q) => {
    const r = await q<MaterialRow>("select * from materials where content_hash = $1 order by created_at desc limit 1", [contentHash]);
    return r.rows[0] ?? null;
  });
}

export async function listMaterials(sub: string): Promise<MaterialSummary[]> {
  return withDb(teacher(sub), async (q) => {
    const r = await q<MaterialSummary>(
      `select m.id, m.class_id, m.title, m.status, m.source_type, m.updated_at, m.published_at, m.position, m.share_token, m.listen_seconds,
              (select count(*)::int from sections s where s.material_id = m.id) as section_count,
              (select count(*)::int from sections s where s.material_id = m.id and s.status = 'flagged' and not (s.fact_guard->>'acknowledged')::boolean) as flagged_count
       from materials m order by m.updated_at desc`,
    );
    return r.rows;
  });
}

export async function updateMaterial(
  owner: Owner,
  id: string,
  patch: Partial<{
    title: string;
    classId: string | null;
    supports: Supports;
    status: MaterialStatus;
    tldr: string[] | null;
    wordPreview: WordPreviewEntry[] | null;
    assignmentSteps: string[] | null;
    imageDescriptions: string[] | null;
    listenSeconds: number;
    processingError: string | null;
    position: number;
    language: string;
    direction: "ltr" | "rtl";
    sourceText: string;
    piiReport: unknown;
  }>,
  expectedVersion?: number,
): Promise<MaterialRow> {
  return withDb(ctxFor(owner), async (q) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    const add = (col: string, v: unknown) => {
      params.push(v);
      sets.push(`${col} = $${params.length}`);
    };
    const json = (v: unknown) => (v === null ? null : JSON.stringify(v));
    if (patch.title !== undefined) add("title", patch.title);
    if (patch.classId !== undefined) add("class_id", patch.classId);
    if (patch.supports !== undefined) add("supports", json(patch.supports));
    if (patch.status !== undefined) {
      add("status", patch.status);
      if (patch.status === "published") sets.push("published_at = coalesce(published_at, now())");
    }
    if (patch.tldr !== undefined) add("tldr", json(patch.tldr));
    if (patch.wordPreview !== undefined) add("word_preview", json(patch.wordPreview));
    if (patch.assignmentSteps !== undefined) add("assignment_steps", json(patch.assignmentSteps));
    if (patch.imageDescriptions !== undefined) add("image_descriptions", json(patch.imageDescriptions));
    if (patch.listenSeconds !== undefined) add("listen_seconds", patch.listenSeconds);
    if (patch.processingError !== undefined) add("processing_error", patch.processingError);
    if (patch.position !== undefined) add("position", patch.position);
    if (patch.language !== undefined) add("source_language", patch.language);
    if (patch.direction !== undefined) add("direction", patch.direction);
    if (patch.sourceText !== undefined) add("source_text", patch.sourceText);
    if (patch.piiReport !== undefined) add("pii_report", json(patch.piiReport));
    if (!sets.length) return getMaterial(owner, id);
    params.push(id);
    let sql = `update materials set ${sets.join(", ")} where id = $${params.length}`;
    sql += ownerClause(owner, params);
    if (expectedVersion !== undefined) {
      params.push(expectedVersion);
      sql += ` and version = $${params.length}`;
    }
    const r = await q<MaterialRow>(`${sql} returning *`, params);
    if (!r.rows[0]) {
      const probe: unknown[] = [id];
      const exists = await q(`select 1 from materials where id = $1${ownerClause(owner, probe)}`, probe);
      throw exists.rows[0] ? new ConflictError() : new NotFoundError();
    }
    return r.rows[0];
  });
}

export async function rotateShareToken(sub: string, id: string): Promise<MaterialRow> {
  return withDb(teacher(sub), async (q) => {
    const r = await q<MaterialRow>("update materials set share_token = gen_share_token(), share_rotated_at = now() where id = $1 returning *", [id]);
    if (!r.rows[0]) throw new NotFoundError();
    return r.rows[0];
  });
}

export async function reorderMaterials(sub: string, classId: string, orderedIds: string[]): Promise<void> {
  await withDb(teacher(sub), async (q) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await q("update materials set position = $1 where id = $2 and class_id = $3", [i, orderedIds[i], classId]);
    }
  });
}

export async function deleteMaterial(owner: Owner, id: string): Promise<void> {
  await withDb(ctxFor(owner), async (q) => {
    const params: unknown[] = [id];
    const r = await q(`delete from materials where id = $1${ownerClause(owner, params)}`, params);
    if (!r.affectedRows) throw new NotFoundError();
  });
}

export async function duplicateMaterial(sub: string, id: string, targetClassId: string | null): Promise<MaterialRow> {
  return withDb(teacher(sub), async (q) => {
    const m = await q<MaterialRow>(
      `insert into materials (teacher_id, class_id, title, source_type, source_name, source_language, direction, source_text, content_hash, supports, status, tldr, word_preview, assignment_steps, image_descriptions, listen_seconds)
       select teacher_id, $2, title, source_type, source_name, source_language, direction, source_text, content_hash, supports,
              case when status = 'published' then 'draft'::material_status else status end,
              tldr, word_preview, assignment_steps, image_descriptions, listen_seconds
       from materials where id = $1 returning *`,
      [id, targetClassId],
    );
    const copy = m.rows[0];
    if (!copy) throw new NotFoundError();
    await q(
      `insert into sections (material_id, position, status, attempts, title, about, original, levels, quick_checks, fact_guard, readability)
       select $2, position, status, attempts, title, about, original, levels, quick_checks, fact_guard, readability from sections where material_id = $1`,
      [id, copy.id],
    );
    return copy;
  });
}

export async function claimDraft(sub: string, draftToken: string): Promise<string | null> {
  return withDb(teacher(sub), async (q) => {
    const r = await q<{ id: string | null }>("select claim_draft_material($1) as id", [draftToken]);
    return r.rows[0]?.id ?? null;
  });
}

// ---------------------------------------------------------------- sections

export async function replaceSections(materialId: string, drafts: SectionDraft[]): Promise<SectionRow[]> {
  return withDb(service, async (q) => {
    await q("delete from sections where material_id = $1", [materialId]);
    const rows: SectionRow[] = [];
    for (const d of drafts) {
      const r = await q<SectionRow>(
        "insert into sections (material_id, position, title, original) values ($1, $2, $3, $4::jsonb) returning *",
        [materialId, d.position, d.title, JSON.stringify(d.original)],
      );
      rows.push(r.rows[0]!);
    }
    return rows;
  });
}

export const LEASE_SECONDS = 90;
export const MAX_ATTEMPTS = 3;

// Atomically claims one section to process. Expired leases are reclaimable,
// so a tab that closed mid-processing is picked up by the next caller.
export async function claimNextSection(materialId: string): Promise<SectionRow | null> {
  return withDb(service, async (q) => {
    const r = await q<SectionRow>(
      `update sections set status = 'processing', lease_until = now() + ($2 || ' seconds')::interval, attempts = attempts + 1
       where id = (
         select id from sections
         where material_id = $1 and attempts < $3
           and (status = 'pending' or (status = 'processing' and lease_until < now()))
         order by position limit 1 for update skip locked
       ) returning *`,
      [materialId, String(LEASE_SECONDS), MAX_ATTEMPTS],
    );
    return r.rows[0] ?? null;
  });
}

export async function completeSection(
  id: string,
  result: {
    title: string;
    about: string;
    levels: SectionRow["levels"];
    quickChecks: SectionRow["quick_checks"];
    factGuard: SectionRow["fact_guard"];
    readability: SectionRow["readability"];
    status: "done" | "flagged";
  },
): Promise<void> {
  await withDb(service, async (q) => {
    await q(
      `update sections set status = $2, lease_until = null, error = null, title = $3, about = $4, levels = $5::jsonb, quick_checks = $6::jsonb, fact_guard = $7::jsonb, readability = $8::jsonb where id = $1`,
      [id, result.status, result.title, result.about, JSON.stringify(result.levels), JSON.stringify(result.quickChecks), JSON.stringify(result.factGuard), JSON.stringify(result.readability)],
    );
  });
}

export async function failSection(id: string, error: string, final: boolean): Promise<void> {
  await withDb(service, async (q) => {
    await q("update sections set status = $2, lease_until = null, error = $3 where id = $1", [id, final ? "failed" : "pending", error]);
  });
}

export async function sectionProgress(materialId: string): Promise<{ total: number; done: number; flagged: number; failed: number; processing: number; pending: number }> {
  return withDb(service, async (q) => {
    const r = await q<{ status: string; n: number }>("select status, count(*)::int as n from sections where material_id = $1 group by status", [materialId]);
    const by = Object.fromEntries(r.rows.map((x) => [x.status, x.n])) as Record<string, number>;
    const total = r.rows.reduce((a, x) => a + x.n, 0);
    return { total, done: by.done ?? 0, flagged: by.flagged ?? 0, failed: by.failed ?? 0, processing: by.processing ?? 0, pending: by.pending ?? 0 };
  });
}

export async function updateSection(
  owner: Owner,
  materialId: string,
  sectionId: string,
  patch: Partial<{
    title: string;
    about: string;
    original: SectionRow["original"];
    levels: SectionRow["levels"];
    quickChecks: SectionRow["quick_checks"];
    factGuard: SectionRow["fact_guard"];
    status: "done" | "flagged" | "pending";
  }>,
  expectedVersion?: number,
): Promise<SectionRow> {
  return withDb(ctxFor(owner), async (q) => {
    if (owner.kind === "draft") {
      const own = await q("select 1 from materials where id = $1 and draft_token = $2 and teacher_id is null", [materialId, owner.draftToken]);
      if (!own.rows[0]) throw new NotFoundError();
    }
    const sets: string[] = [];
    const params: unknown[] = [];
    const add = (col: string, v: unknown) => {
      params.push(v);
      sets.push(`${col} = $${params.length}`);
    };
    if (patch.title !== undefined) add("title", patch.title);
    if (patch.about !== undefined) add("about", patch.about);
    if (patch.original !== undefined) add("original", JSON.stringify(patch.original));
    if (patch.levels !== undefined) add("levels", JSON.stringify(patch.levels));
    if (patch.quickChecks !== undefined) add("quick_checks", JSON.stringify(patch.quickChecks));
    if (patch.factGuard !== undefined) add("fact_guard", JSON.stringify(patch.factGuard));
    if (patch.status !== undefined) add("status", patch.status);
    if (!sets.length) {
      const r = await q<SectionRow>("select * from sections where id = $1 and material_id = $2", [sectionId, materialId]);
      if (!r.rows[0]) throw new NotFoundError();
      return r.rows[0];
    }
    params.push(sectionId, materialId);
    let sql = `update sections set ${sets.join(", ")} where id = $${params.length - 1} and material_id = $${params.length}`;
    if (expectedVersion !== undefined) {
      params.push(expectedVersion);
      sql += ` and version = $${params.length}`;
    }
    const r = await q<SectionRow>(`${sql} returning *`, params);
    if (!r.rows[0]) {
      const exists = await q("select 1 from sections where id = $1 and material_id = $2", [sectionId, materialId]);
      throw exists.rows[0] ? new ConflictError() : new NotFoundError();
    }
    return r.rows[0];
  });
}

export async function deleteSection(owner: Owner, materialId: string, sectionId: string): Promise<void> {
  await withDb(ctxFor(owner), async (q) => {
    if (owner.kind === "draft") {
      const own = await q("select 1 from materials where id = $1 and draft_token = $2 and teacher_id is null", [materialId, owner.draftToken]);
      if (!own.rows[0]) throw new NotFoundError();
    }
    const r = await q("delete from sections where id = $1 and material_id = $2", [sectionId, materialId]);
    if (!r.affectedRows) throw new NotFoundError();
    await q(
      `update sections s set position = r.rn - 1 from (select id, row_number() over (order by position) as rn from sections where material_id = $1) r where s.id = r.id`,
      [materialId],
    );
  });
}

export async function resetSectionForRegenerate(owner: Owner, materialId: string, sectionId: string): Promise<void> {
  await updateSection(owner, materialId, sectionId, { status: "pending" });
  await withDb(service, async (q) => {
    await q("update sections set attempts = 0, lease_until = null, error = null where id = $1 and material_id = $2", [sectionId, materialId]);
  });
}
