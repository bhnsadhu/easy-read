import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export type Role = "anon" | "authenticated" | "service";

// Mirrors just enough of Supabase's auth schema for policies to run unchanged.
const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

export async function createTestDb() {
  const db = new PGlite({ extensions: { citext } });
  await db.exec(SUPABASE_SHIM);
  const dir = path.resolve(__dirname, "../../supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(dir, file), "utf8"));
  }

  async function createUser(email: string): Promise<string> {
    const r = await db.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]);
    return r.rows[0]!.id;
  }

  // Runs fn as the given role inside one transaction so SET LOCAL scopes cleanly.
  async function as<T>(role: Role, sub: string | null, fn: (q: typeof db.query) => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => {
      if (role !== "service") {
        await tx.exec(`select set_config('request.jwt.claims', '${sub ? JSON.stringify({ sub, role }) : ""}', true)`);
        await tx.exec(`set local role ${role}`);
      }
      return fn(tx.query.bind(tx) as typeof db.query);
    });
  }

  return { db, createUser, as, close: () => db.close() };
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;
