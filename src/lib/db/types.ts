export type DbRole = "anon" | "authenticated" | "service";

export type DbContext = {
  role: DbRole;
  // auth.users id; required when role is "authenticated".
  sub?: string;
};

export type QueryResult<T> = { rows: T[]; affectedRows: number };

export type Query = <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<QueryResult<T>>;

export type Db = {
  // Runs fn inside one transaction with RLS applied for the given context.
  run<T>(ctx: DbContext, fn: (q: Query) => Promise<T>): Promise<T>;
  close(): Promise<void>;
};
