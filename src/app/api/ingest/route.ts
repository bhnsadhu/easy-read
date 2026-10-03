import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, getClientIp, jsonError, readJson } from "@/lib/api";
import { resolveOwner } from "@/lib/auth/owner";
import { ensureDraftToken } from "@/lib/auth/draft";
import { enforceRateLimit, LIMITS } from "@/lib/limits";
import { ingest, isRtl } from "@/lib/ingest";
import { getLlm } from "@/lib/llm";
import { readUpload } from "@/lib/uploads";

const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("paste"), text: z.string().min(1).max(400_000), title: z.string().max(200).optional() }),
  z.object({ kind: z.literal("url"), url: z.string().url().max(2048) }),
  z.object({ kind: z.literal("upload"), uploadId: z.string().max(64), name: z.string().max(255), mime: z.string().max(100) }),
]);

export type IngestResponse = {
  text: string;
  title: string | null;
  language: string;
  direction: "ltr" | "rtl";
  warnings: string[];
  imageDescriptions: string[];
  pii: { findings: { kind: string; match: string; line: number; index: number }[]; summary: string };
  contentHash: string;
  sourceType: "file" | "paste" | "url";
  sourceName: string | null;
  usedVision: boolean;
};

// Extracts text without creating anything. The teacher sees warnings and any
// personal information before processing starts.
export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await readJson<unknown>(request, 2_000_000));
    if (!parsed.success) return jsonError("bad_request", "We couldn't read that request. Try again.", 400);
    const input = parsed.data;

    let owner = await resolveOwner();
    if (!owner) owner = { kind: "draft", draftToken: await ensureDraftToken() };
    const ip = getClientIp(request);
    const key = owner.kind === "teacher" ? owner.sub : ip;
    await enforceRateLimit(`ingest:${key}`, owner.kind === "teacher" ? LIMITS.teacherIngestPerHour : LIMITS.anonIngestPerHour, 3600, "That's a lot of imports in one hour. Take a short break and try again.");

    let result;
    let sourceType: IngestResponse["sourceType"];
    let sourceName: string | null = null;
    let usedVision = false;
    let imageDescriptions: string[] = [];

    if (input.kind === "paste") {
      result = await ingest({ kind: "paste", text: input.text });
      sourceType = "paste";
      sourceName = input.title?.trim() || null;
    } else if (input.kind === "url") {
      result = await ingest({ kind: "url", url: input.url });
      sourceType = "url";
      sourceName = input.url;
    } else {
      const ownerKey = owner.kind === "teacher" ? owner.sub : owner.draftToken;
      const bytes = await readUpload(ownerKey, input.uploadId);
      if (!bytes) return jsonError("not_found", "We couldn't find that upload. Try uploading the file again.", 404);
      result = await ingest({ kind: "file", buffer: bytes, name: input.name, mime: input.mime });
      sourceType = "file";
      sourceName = input.name;
      if (result.doc.needsVision) {
        const llm = await getLlm();
        const kind = result.sniff?.kind === "pdf" ? "pdf" : "image";
        const data = kind === "image" && result.prepared ? result.prepared.buffer : bytes;
        const vision = await llm.extractFromVision({ kind, data, mime: kind === "pdf" ? "application/pdf" : "image/jpeg", hint: input.name });
        usedVision = true;
        imageDescriptions = vision.imageDescriptions;
        const warnings = [...result.doc.warnings, ...vision.warnings];
        result = await ingest({ kind: "paste", text: vision.text });
        result.doc.warnings.push(...warnings);
        if (vision.language) result.doc.language = vision.language;
      }
    }

    const response: IngestResponse = {
      text: result.doc.text,
      title: result.doc.title ?? null,
      language: result.doc.language ?? "en",
      direction: isRtl(result.doc.language) ? "rtl" : "ltr",
      warnings: result.doc.warnings,
      imageDescriptions,
      pii: result.pii,
      contentHash: result.contentHash,
      sourceType,
      sourceName,
      usedVision,
    };
    return NextResponse.json(response);
  } catch (err) {
    return errorResponse(err);
  }
}
