import "server-only";
import { withDb, type DbContext } from "@/lib/db";
import { ConflictError, NotFoundError, type ClassRow, type GradeBand } from "./types";

const teacher = (sub: string): DbContext => ({ role: "authenticated", sub });

export const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function normalizeHandle(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['".]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function listClasses(sub: string): Promise<ClassRow[]> {
  return withDb(teacher(sub), async (q) => (await q<ClassRow>("select * from classes order by created_at")).rows);
}

export async function getClass(sub: string, id: string): Promise<ClassRow> {
  return withDb(teacher(sub), async (q) => {
    const r = await q<ClassRow>("select * from classes where id = $1", [id]);
    if (!r.rows[0]) throw new NotFoundError();
    return r.rows[0];
  });
}

export async function isHandleAvailable(sub: string, handle: string): Promise<{ available: boolean; reason?: "taken" | "reserved" | "invalid" }> {
  if (!HANDLE_RE.test(handle)) return { available: false, reason: "invalid" };
  return withDb(teacher(sub), async (q) => {
    const reserved = await q<{ r: boolean }>("select handle_is_reserved($1) as r", [handle]);
    if (reserved.rows[0]?.r) return { available: false, reason: "reserved" };
    // Visible rows are only ours; check the unique index via a service-free probe:
    // an insert would fail, so we look through the public RPC instead.
    const taken = await q<{ c: unknown }>("select public_class($1) as c", [handle]);
    return taken.rows[0]?.c ? { available: false, reason: "taken" } : { available: true };
  });
}

export async function createClass(
  sub: string,
  input: { name: string; gradeBand: GradeBand; handle: string; theme: string; welcome?: string | null },
): Promise<ClassRow> {
  return withDb(teacher(sub), async (q) => {
    const r = await q<ClassRow>(
      "insert into classes (teacher_id, name, grade_band, handle, theme, welcome) values ($1, $2, $3, $4, $5, $6) returning *",
      [sub, input.name, input.gradeBand, input.handle, input.theme, input.welcome ?? null],
    );
    return r.rows[0]!;
  });
}

export async function updateClass(
  sub: string,
  id: string,
  patch: Partial<{ name: string; gradeBand: GradeBand; handle: string; theme: string; welcome: string | null }>,
  expectedVersion?: number,
): Promise<ClassRow> {
  return withDb(teacher(sub), async (q) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    const add = (col: string, v: unknown) => {
      params.push(v);
      sets.push(`${col} = $${params.length}`);
    };
    if (patch.name !== undefined) add("name", patch.name);
    if (patch.gradeBand !== undefined) add("grade_band", patch.gradeBand);
    if (patch.handle !== undefined) add("handle", patch.handle);
    if (patch.theme !== undefined) add("theme", patch.theme);
    if (patch.welcome !== undefined) add("welcome", patch.welcome);
    if (!sets.length) {
      const r = await q<ClassRow>("select * from classes where id = $1", [id]);
      if (!r.rows[0]) throw new NotFoundError();
      return r.rows[0];
    }
    params.push(id);
    let sql = `update classes set ${sets.join(", ")} where id = $${params.length}`;
    if (expectedVersion !== undefined) {
      params.push(expectedVersion);
      sql += ` and version = $${params.length}`;
    }
    const r = await q<ClassRow>(`${sql} returning *`, params);
    if (!r.rows[0]) {
      const exists = await q("select 1 from classes where id = $1", [id]);
      throw exists.rows[0] ? new ConflictError() : new NotFoundError();
    }
    return r.rows[0];
  });
}

export async function deleteClass(sub: string, id: string): Promise<void> {
  await withDb(teacher(sub), async (q) => {
    const r = await q("delete from classes where id = $1", [id]);
    if (!r.affectedRows) throw new NotFoundError();
  });
}
