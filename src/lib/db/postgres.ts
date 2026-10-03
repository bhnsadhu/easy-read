import "server-only";
import postgres from "postgres";
import type { Db, DbContext, Query } from "./types";

// Production driver: Supabase's Supavisor pooler (transaction mode, prepare: false).
export function createPostgresDb(url: string): Db {
  const sql = postgres(url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 });

  return {
    async run(ctx: DbContext, fn) {
      return sql.begin(async (tx) => {
        if (ctx.role !== "service") {
          const claims = ctx.sub ? JSON.stringify({ sub: ctx.sub, role: ctx.role }) : "";
          await tx.unsafe("select set_config('request.jwt.claims', $1, true)", [claims]);
          await tx.unsafe(`set local role ${ctx.role}`);
        }
        const q: Query = async (stmt, params = []) => {
          const r = await tx.unsafe(stmt, params as never[]);
          return { rows: Array.from(r) as never[], affectedRows: r.count };
        };
        return fn(q);
      }) as Promise<ReturnType<typeof fn>>;
    },
    close: () => sql.end({ timeout: 5 }),
  };
}
