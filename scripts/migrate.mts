// Applies supabase/migrations/*.sql to DATABASE_URL in order, once each.
// Works on Supabase, Neon, or any Postgres: if the database has no `auth`
// schema (anything but Supabase), a minimal shim is created first.
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (Postgres connection string) first.");
  process.exit(1);
}

const SHIM = `
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  end $$;
  -- The app connects as the database owner and switches role per request.
  -- On Postgres 16+ (Neon) a role's creator cannot SET ROLE to it without this.
  grant anon, authenticated to current_user;
  grant usage on schema public to anon, authenticated;
  create schema if not exists auth;
  create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text unique);
  create or replace function auth.uid() returns uuid language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

const sql = postgres(url, { prepare: false, max: 1 });
try {
  const isSupabase = (await sql`select to_regprocedure('auth.uid()') as f`)[0]?.f !== null && (await sql`select 1 from pg_roles where rolname = 'supabase_auth_admin'`).length > 0;
  if (!isSupabase) {
    console.log("No Supabase auth schema found; creating the minimal shim.");
    await sql.unsafe(SHIM);
  }
  await sql`create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql`select name from public.schema_migrations`).map((r) => r.name as string));
  const dir = path.resolve(process.cwd(), "supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (applied.has(file)) {
      console.log(`skip  ${file}`);
      continue;
    }
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(path.join(dir, file), "utf8"));
      await tx`insert into public.schema_migrations (name) values (${file})`;
    });
    console.log(`apply ${file}`);
  }
  console.log("Database is ready.");
} finally {
  await sql.end();
}
