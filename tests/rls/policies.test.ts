import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./harness";

let t: TestDb;
let alice: string;
let bob: string;

beforeAll(async () => {
  t = await createTestDb();
  alice = await t.createUser("alice@example.edu");
  bob = await t.createUser("bob@example.edu");
});

afterAll(async () => {
  await t.close();
});

const SECTION = JSON.stringify({ blocks: [{ type: "p", sentences: ["The mitochondria makes energy."] }] });

async function seedClassAndMaterial(owner: string, handle: string) {
  return t.as("authenticated", owner, async (q) => {
    const c = await q<{ id: string; code: string }>(
      "insert into classes (teacher_id, name, grade_band, handle) values ($1, $2, '6-8', $3) returning id, code",
      [owner, "Science", handle],
    );
    const m = await q<{ id: string; share_token: string }>(
      "insert into materials (teacher_id, class_id, title, source_type) values ($1, $2, 'Cells', 'paste') returning id, share_token",
      [owner, c.rows[0]!.id],
    );
    await q("insert into sections (material_id, position, status, title, original) values ($1, 0, 'done', 'Part one', $2::jsonb)", [
      m.rows[0]!.id,
      SECTION,
    ]);
    return { classId: c.rows[0]!.id, code: c.rows[0]!.code, materialId: m.rows[0]!.id, token: m.rows[0]!.share_token };
  });
}

describe("teachers", () => {
  it("row is created automatically when an auth user is created", async () => {
    const r = await t.as("service", null, (q) => q<{ email: string }>("select email from teachers where id = $1", [alice]));
    expect(r.rows[0]?.email).toBe("alice@example.edu");
  });

  it("a teacher sees only their own row", async () => {
    const r = await t.as("authenticated", alice, (q) => q<{ id: string }>("select id from teachers"));
    expect(r.rows.map((x) => x.id)).toEqual([alice]);
  });
});

describe("classes and materials isolation", () => {
  let a: Awaited<ReturnType<typeof seedClassAndMaterial>>;

  beforeAll(async () => {
    a = await seedClassAndMaterial(alice, "ms-alice");
  });

  it("owner can read their class, material, and sections", async () => {
    const r = await t.as("authenticated", alice, async (q) => ({
      classes: (await q("select id from classes")).rows.length,
      materials: (await q("select id from materials")).rows.length,
      sections: (await q("select id from sections")).rows.length,
    }));
    expect(r).toEqual({ classes: 1, materials: 1, sections: 1 });
  });

  it("another teacher sees nothing", async () => {
    const r = await t.as("authenticated", bob, async (q) => ({
      classes: (await q("select id from classes")).rows.length,
      materials: (await q("select id from materials")).rows.length,
      sections: (await q("select id from sections")).rows.length,
    }));
    expect(r).toEqual({ classes: 0, materials: 0, sections: 0 });
  });

  it("another teacher cannot update or delete (0 rows affected)", async () => {
    const r = await t.as("authenticated", bob, async (q) => ({
      upd: (await q("update materials set title = 'pwned' where id = $1", [a.materialId])).affectedRows,
      del: (await q("delete from sections where material_id = $1", [a.materialId])).affectedRows,
      cls: (await q("update classes set name = 'pwned' where id = $1", [a.classId])).affectedRows,
    }));
    expect(r).toEqual({ upd: 0, del: 0, cls: 0 });
    const title = await t.as("service", null, (q) => q<{ title: string }>("select title from materials where id = $1", [a.materialId]));
    expect(title.rows[0]?.title).toBe("Cells");
  });

  it("a teacher cannot insert rows owned by someone else", async () => {
    await expect(
      t.as("authenticated", bob, (q) =>
        q("insert into materials (teacher_id, title, source_type) values ($1, 'x', 'paste')", [alice]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      t.as("authenticated", bob, (q) =>
        q("insert into sections (material_id, position, original) values ($1, 9, $2::jsonb)", [a.materialId, SECTION]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("updates bump version for conflict detection", async () => {
    const before = await t.as("authenticated", alice, (q) => q<{ version: number }>("select version from materials where id = $1", [a.materialId]));
    await t.as("authenticated", alice, (q) => q("update materials set title = 'Cells and energy' where id = $1", [a.materialId]));
    const after = await t.as("authenticated", alice, (q) => q<{ version: number }>("select version from materials where id = $1", [a.materialId]));
    expect(after.rows[0]!.version).toBe(before.rows[0]!.version + 1);
  });
});

describe("anonymous access", () => {
  let a: Awaited<ReturnType<typeof seedClassAndMaterial>>;

  beforeAll(async () => {
    a = await seedClassAndMaterial(alice, "mr-anon");
  });

  it("anon cannot select from any table", async () => {
    for (const table of ["teachers", "classes", "materials", "sections", "material_assets", "rate_limits", "generation_usage"]) {
      await expect(t.as("anon", null, (q) => q(`select * from ${table}`))).rejects.toThrow(/permission denied/);
    }
  });

  it("anon cannot call teacher-only RPCs or the limit counters", async () => {
    await expect(t.as("anon", null, (q) => q("select claim_draft_material('x')"))).rejects.toThrow(/permission denied/);
    await expect(t.as("anon", null, (q) => q("select bump_rate_limit('k', 60)"))).rejects.toThrow(/permission denied/);
    await expect(t.as("authenticated", alice, (q) => q("select bump_rate_limit('k', 60)"))).rejects.toThrow(/permission denied/);
  });

  it("public_material returns nothing for a draft and full content once published", async () => {
    const draft = await t.as("anon", null, (q) => q<{ m: unknown }>("select public_material($1) as m", [a.token]));
    expect(draft.rows[0]!.m).toBeNull();

    await t.as("authenticated", alice, (q) => q("update materials set status = 'published', published_at = now() where id = $1", [a.materialId]));

    const pub = await t.as("anon", null, (q) => q<{ m: { title: string; sections: { title: string }[]; class: { handle: string } } }>("select public_material($1) as m", [a.token]));
    expect(pub.rows[0]!.m.title).toBe("Cells");
    expect(pub.rows[0]!.m.sections).toHaveLength(1);
    expect(pub.rows[0]!.m.sections[0]!.title).toBe("Part one");
    expect(pub.rows[0]!.m.class.handle).toBe("mr-anon");
    // Never leaks private columns.
    expect(JSON.stringify(pub.rows[0]!.m)).not.toMatch(/teacher_id|draft_token|source_text|pii_report|share_rotated_at/);
  });

  it("public_class lists only published materials", async () => {
    await t.as("authenticated", alice, (q) =>
      q("insert into materials (teacher_id, class_id, title, source_type, position) values ($1, $2, 'Hidden draft', 'paste', 5)", [alice, a.classId]),
    );
    const r = await t.as("anon", null, (q) => q<{ c: { name: string; materials: { title: string }[] } }>("select public_class($1) as c", ["MR-ANON"]));
    expect(r.rows[0]!.c.name).toBe("Science");
    expect(r.rows[0]!.c.materials.map((m) => m.title)).toEqual(["Cells"]);
  });

  it("class code lookup tolerates case and spaces", async () => {
    const messy = ` ${a.code.toLowerCase().slice(0, 3)} ${a.code.slice(3)} `;
    const r = await t.as("anon", null, (q) => q<{ h: string }>("select public_class_by_code($1) as h", [messy]));
    expect(r.rows[0]!.h).toBe("mr-anon");
    const miss = await t.as("anon", null, (q) => q<{ h: string | null }>("select public_class_by_code('ZZZZZZ') as h"));
    expect(miss.rows[0]!.h).toBeNull();
  });

  it("rotating the link kills the old token; unpublishing hides it", async () => {
    const rotated = await t.as("authenticated", alice, (q) =>
      q<{ share_token: string }>("update materials set share_token = gen_share_token(), share_rotated_at = now() where id = $1 returning share_token", [a.materialId]),
    );
    const newToken = rotated.rows[0]!.share_token;
    expect(newToken).not.toBe(a.token);
    expect(newToken).toMatch(/^[A-Za-z0-9_-]{22}$/);

    const old = await t.as("anon", null, (q) => q<{ m: unknown }>("select public_material($1) as m", [a.token]));
    expect(old.rows[0]!.m).toBeNull();
    const fresh = await t.as("anon", null, (q) => q<{ m: unknown }>("select public_material($1) as m", [newToken]));
    expect(fresh.rows[0]!.m).not.toBeNull();

    await t.as("authenticated", alice, (q) => q("update materials set status = 'draft' where id = $1", [a.materialId]));
    const hidden = await t.as("anon", null, (q) => q<{ m: unknown }>("select public_material($1) as m", [newToken]));
    expect(hidden.rows[0]!.m).toBeNull();
  });

  it("unknown tokens return null, never an error", async () => {
    const r = await t.as("anon", null, (q) => q<{ m: unknown; c: unknown }>("select public_material('nope') as m, public_class('nope') as c"));
    expect(r.rows[0]).toEqual({ m: null, c: null });
  });
});

describe("try-before-signup drafts", () => {
  it("anonymous drafts are invisible to teachers until claimed, and claimable once", async () => {
    const draftToken = "draft_abc123";
    // One anonymous session can create several drafts.
    // Older on purpose: PGlite's clock can give back-to-back inserts the same created_at.
    await t.as("service", null, (q) => q("insert into materials (draft_token, title, source_type, created_at) values ($1, 'First try', 'paste', now() - interval '1 minute')", [draftToken]));
    const m = await t.as("service", null, (q) =>
      q<{ id: string }>("insert into materials (draft_token, title, source_type) values ($1, 'Try it', 'paste') returning id", [draftToken]),
    );
    const id = m.rows[0]!.id;

    const unseen = await t.as("authenticated", alice, (q) => q("select id from materials where id = $1", [id]));
    expect(unseen.rows).toHaveLength(0);

    const claimed = await t.as("authenticated", alice, (q) => q<{ id: string | null }>("select claim_draft_material($1) as id", [draftToken]));
    expect(claimed.rows[0]!.id).toBe(id);

    const seen = await t.as("authenticated", alice, (q) => q("select id from materials where id = $1", [id]));
    expect(seen.rows).toHaveLength(1);
    const both = await t.as("authenticated", alice, (q) => q("select id from materials where title in ('First try', 'Try it')"));
    expect(both.rows).toHaveLength(2);

    const again = await t.as("authenticated", bob, (q) => q<{ id: string | null }>("select claim_draft_material($1) as id", [draftToken]));
    expect(again.rows[0]!.id).toBeNull();
  });

  it("a material must have an owner or a draft token", async () => {
    await expect(
      t.as("service", null, (q) => q("insert into materials (title, source_type) values ('orphan', 'paste')")),
    ).rejects.toThrow(/materials_owner/);
  });
});

describe("class handles and codes", () => {
  it("rejects reserved, malformed, and case-duplicate handles", async () => {
    for (const bad of ["api", "Admin", "-start", "a", "has space", "x".repeat(41)]) {
      await expect(
        t.as("authenticated", alice, (q) => q("insert into classes (teacher_id, name, grade_band, handle) values ($1, 'x', '3-5', $2)", [alice, bad])),
      ).rejects.toThrow();
    }
    await t.as("authenticated", alice, (q) => q("insert into classes (teacher_id, name, grade_band, handle) values ($1, 'x', '3-5', 'ms-rivera')", [alice]));
    await expect(
      t.as("authenticated", bob, (q) => q("insert into classes (teacher_id, name, grade_band, handle) values ($1, 'y', '3-5', 'MS-RIVERA')", [bob])),
    ).rejects.toThrow(/check constraint/);
    await expect(
      t.as("authenticated", bob, (q) => q("insert into classes (teacher_id, name, grade_band, handle) values ($1, 'y', '3-5', 'ms-rivera')", [bob])),
    ).rejects.toThrow(/duplicate|unique/);
  });

  it("generates unique 6-character codes without look-alike characters", async () => {
    const r = await t.as("service", null, (q) => q<{ code: string }>("select code from classes"));
    const codes = r.rows.map((x) => x.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of codes) expect(c).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});

describe("rate limit counters (service role only)", () => {
  it("increment per key and window", async () => {
    const r = await t.as("service", null, async (q) => [
      (await q<{ n: number }>("select bump_rate_limit('ip:1.2.3.4', 60) as n")).rows[0]!.n,
      (await q<{ n: number }>("select bump_rate_limit('ip:1.2.3.4', 60) as n")).rows[0]!.n,
      (await q<{ n: number }>("select bump_rate_limit('ip:9.9.9.9', 60) as n")).rows[0]!.n,
      (await q<{ n: number }>("select bump_generation_usage($1) as n", [alice])).rows[0]!.n,
      (await q<{ n: number }>("select bump_generation_usage($1) as n", [alice])).rows[0]!.n,
    ]);
    expect(r).toEqual([1, 2, 1, 1, 2]);
  });
});
