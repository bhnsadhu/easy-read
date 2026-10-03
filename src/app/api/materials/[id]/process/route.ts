import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, getClientIp, jsonError } from "@/lib/api";
import { resolveOwner } from "@/lib/auth/owner";
import { enforceRateLimit, LIMITS } from "@/lib/limits";
import { processOneSection, type Progress } from "@/lib/pipeline/process";
import { sectionProgress, getMaterial } from "@/lib/data/materials";

export const maxDuration = 60;
const BUDGET_MS = 25_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Processes sections for up to ~25 s, then returns progress. The client calls
// again until status leaves "processing". State lives in the database, so a
// refresh, a closed tab, or a second tab simply continues the same work.
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!UUID.test(id)) return jsonError("not_found", "We couldn't find that material.", 404);
    const owner = await resolveOwner();
    if (!owner) return jsonError("unauthenticated", "Your session ended. Reload the page to continue.", 401);
    await enforceRateLimit(`process:${getClientIp(request)}`, LIMITS.processCallsPerMinute, 60, "Too many requests. Give it a few seconds.");

    const started = Date.now();
    let last: { claimed: boolean; progress: Progress } | null = null;
    do {
      last = await processOneSection(owner, id);
    } while (last.claimed && last.progress.status === "processing" && Date.now() - started < BUDGET_MS);
    return NextResponse.json(last.progress);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!UUID.test(id)) return jsonError("not_found", "We couldn't find that material.", 404);
    const owner = await resolveOwner();
    if (!owner) return jsonError("unauthenticated", "Your session ended. Reload the page to continue.", 401);
    const material = await getMaterial(owner, id);
    const p = await sectionProgress(id);
    const status: Progress["status"] = material.status === "processing" ? "processing" : material.status === "published" ? "draft" : material.status;
    return NextResponse.json({ ...p, status } satisfies Progress);
  } catch (err) {
    return errorResponse(err);
  }
}
