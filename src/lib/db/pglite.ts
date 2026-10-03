import "server-only";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Db, DbContext, Queryable } from "./types";

// Supabase's auth schema, reduced to what our policies and triggers touch.
const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique);
  create function auth.uid() returns uuid language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const db = new PGlite(dataDir, { extensions: { citext } });
  const applied = await db.query<{ n: string }>("select to_regclass('public.materials')::text as n").catch(() => ({ rows: [] as { n: string }[] }));
  if (!applied.rows[0]?.n) {
    await db.exec(SUPABASE_SHIM);
    const dir = path.resolve(process.cwd(), "supabase/migrations");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      await db.exec(readFileSync(path.join(dir, file), "utf8"));
    }
  }

  return {
    async run(ctx: DbContext, fn) {
      return db.transaction(async (tx) => {
        if (ctx.role !== "service") {
          const claims = ctx.sub ? JSON.stringify({ sub: ctx.sub, role: ctx.role }) : "";
          await tx.query("select set_config('request.jwt.claims', $1, true)", [claims]);
          await tx.exec(`set local role ${ctx.role}`);
        }
        const q: Queryable = {
          async query(sql, params = []) {
            const r = await tx.query(sql, params);
            return { rows: r.rows as never[], affectedRows: r.affectedRows ?? 0 };
          },
        };
        return fn(q);
      });
    },
    close: () => db.close(),
  };
}
