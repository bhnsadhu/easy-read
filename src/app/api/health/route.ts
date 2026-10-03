import { NextResponse } from "next/server";
import { withDb } from "@/lib/db";
import { isMockDb, isMockLlm } from "@/lib/env";

export async function GET() {
  try {
    await withDb({ role: "service" }, (q) => q("select 1"));
    return NextResponse.json({ ok: true, db: isMockDb() ? "in-process" : "postgres", llm: isMockLlm() ? "mock" : "anthropic" });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
