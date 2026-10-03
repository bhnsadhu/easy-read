import "server-only";
import { isMockDb, serverEnv } from "@/lib/env";
import type { Db, DbContext, Queryable } from "./types";

export type { Db, DbContext, Queryable };

const globalForDb = globalThis as unknown as { __readeasyDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__readeasyDb) {
    globalForDb.__readeasyDb = (async () => {
      if (isMockDb()) {
        const { createPgliteDb } = await import("./pglite");
        // In-memory per process; the e2e suite and local dev without Supabase use this.
        return createPgliteDb(process.env.PGLITE_DATA_DIR);
      }
      const { createPostgresDb } = await import("./postgres");
      return createPostgresDb(serverEnv().DATABASE_URL!);
    })();
  }
  return globalForDb.__readeasyDb;
}

export async function withDb<T>(ctx: DbContext, fn: (q: Queryable) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.run(ctx, fn);
}
