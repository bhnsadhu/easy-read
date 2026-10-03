import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, jsonError } from "@/lib/api";
import { resolveOwner } from "@/lib/auth/owner";
import { serverEnv } from "@/lib/env";
import { DIRECT_UPLOAD_MAX_BYTES, isValidUploadId, storeDirectUpload, uploadMode } from "@/lib/uploads";

// Direct upload target used only when Supabase Storage is not configured.
export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (uploadMode() !== "direct") return jsonError("not_found", "Not available.", 404);
    const { id } = await ctx.params;
    if (!isValidUploadId(id)) return jsonError("bad_request", "Bad upload id.", 400);
    const owner = await resolveOwner();
    if (!owner) return jsonError("unauthenticated", "Start an upload first.", 401);
    const maxBytes = Math.min(serverEnv().MAX_UPLOAD_MB * 1024 * 1024, DIRECT_UPLOAD_MAX_BYTES);
    const buf = new Uint8Array(await request.arrayBuffer());
    if (!buf.byteLength) return jsonError("bad_request", "That file looks empty.", 400);
    if (buf.byteLength > maxBytes) return jsonError("too_large", "That file is over 4 MB. Try a smaller file, or paste the text.", 413);
    const ownerKey = owner.kind === "teacher" ? owner.sub : owner.draftToken;
    await storeDirectUpload(ownerKey, id, request.headers.get("content-type") ?? "application/octet-stream", buf);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
