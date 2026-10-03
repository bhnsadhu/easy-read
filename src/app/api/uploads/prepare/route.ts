import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, getClientIp, jsonError, readJson } from "@/lib/api";
import { resolveOwner } from "@/lib/auth/owner";
import { ensureDraftToken } from "@/lib/auth/draft";
import { enforceRateLimit, LIMITS } from "@/lib/limits";
import { serverEnv } from "@/lib/env";
import { createSignedUpload, newUploadId, uploadMode } from "@/lib/uploads";

const ALLOWED = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png", "image/webp", "image/gif", "text/plain", "text/markdown", "application/octet-stream", ""]);

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<{ name?: string; mime?: string; size?: number }>(request);
    const maxBytes = serverEnv().MAX_UPLOAD_MB * 1024 * 1024;
    if (typeof body.size !== "number" || body.size <= 0) return jsonError("bad_request", "That file looks empty.", 400);
    if (body.size > maxBytes) {
      return jsonError("too_large", `That file is ${(body.size / 1024 / 1024).toFixed(1)} MB. ReadEasy accepts up to ${serverEnv().MAX_UPLOAD_MB} MB. Try a smaller file, or paste the text.`, 413);
    }
    if (!ALLOWED.has((body.mime ?? "").toLowerCase())) {
      return jsonError("unsupported", "ReadEasy reads PDF, Word (.docx), images, and text files. Try one of those, or paste the text.", 415);
    }
    let owner = await resolveOwner();
    if (!owner) owner = { kind: "draft", draftToken: await ensureDraftToken() };
    const ip = getClientIp(request);
    await enforceRateLimit(`upload:${owner.kind === "teacher" ? owner.sub : ip}`, owner.kind === "teacher" ? LIMITS.teacherIngestPerHour : LIMITS.anonIngestPerHour, 3600, "That's a lot of uploads in one hour. Take a short break and try again.");

    const uploadId = newUploadId();
    const ownerKey = owner.kind === "teacher" ? owner.sub : owner.draftToken;
    if (uploadMode() === "signed") {
      const signed = await createSignedUpload(ownerKey, uploadId);
      return NextResponse.json({ uploadId, mode: "signed", path: signed.path, signedUrl: signed.signedUrl, token: signed.token });
    }
    return NextResponse.json({ uploadId, mode: "direct", url: `/api/uploads/${uploadId}` });
  } catch (err) {
    return errorResponse(err);
  }
}
