import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, getClientIp, jsonError, readJson } from "@/lib/api";
import { resolveOwner } from "@/lib/auth/owner";
import { ensureDraftToken } from "@/lib/auth/draft";
import { enforceDailyGenerationCap, enforceRateLimit, LIMITS } from "@/lib/limits";
import { createMaterial, findDuplicate, getMaterial } from "@/lib/data/materials";
import { DEFAULT_SUPPORTS } from "@/lib/data/types";
import { detectPii } from "@/lib/ingest";
import { prepareMaterial } from "@/lib/pipeline/prepare";
import { createHash } from "node:crypto";

const bodySchema = z.object({
  title: z.string().max(200).optional(),
  text: z.string().min(1).max(400_000),
  language: z.string().min(2).max(8).default("en"),
  direction: z.enum(["ltr", "rtl"]).default("ltr"),
  sourceType: z.enum(["file", "paste", "url"]),
  sourceName: z.string().max(2048).nullable().optional(),
  classId: z.string().uuid().nullable().optional(),
  supports: z
    .object({
      levels: z.array(z.enum(["medium", "simple"])),
      tldr: z.boolean(),
      words: z.boolean(),
      quick_checks: z.boolean(),
      steps: z.boolean(),
    })
    .optional(),
  // The teacher saw the personal-information warning and chose to continue.
  piiAcknowledged: z.boolean().default(false),
  allowDuplicate: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await readJson<unknown>(request, 2_000_000));
    if (!parsed.success) return jsonError("bad_request", "We couldn't read that request. Try again.", 400);
    const input = parsed.data;

    let owner = await resolveOwner();
    if (!owner) owner = { kind: "draft", draftToken: await ensureDraftToken() };
    const ip = getClientIp(request);

    if (owner.kind === "teacher") {
      await enforceDailyGenerationCap(owner.sub);
    } else {
      await enforceRateLimit(`anon-material:${ip}`, LIMITS.anonMaterialsPerDay, 86_400, "You've used today's free tries on this device. Sign in to keep going, free.");
    }

    // Re-check on the final text: redaction may have happened client-side.
    const pii = detectPii(input.text);
    if (pii.findings.length && !input.piiAcknowledged) {
      return NextResponse.json({ error: { code: "pii", message: pii.summary }, pii }, { status: 422 });
    }

    const contentHash = createHash("sha256").update(input.text.trim()).digest("hex");
    if (owner.kind === "teacher" && !input.allowDuplicate) {
      const dup = await findDuplicate(owner.sub, contentHash);
      if (dup) {
        return NextResponse.json({ error: { code: "duplicate", message: `You already have this material: "${dup.title}".` }, duplicate: { id: dup.id, title: dup.title, status: dup.status } }, { status: 409 });
      }
    }

    const material = await createMaterial(owner, {
      title: input.title?.trim() || "Untitled",
      sourceType: input.sourceType,
      sourceName: input.sourceName ?? null,
      language: input.language,
      direction: input.direction,
      sourceText: input.text,
      contentHash,
      piiReport: pii.findings.length ? { count: pii.findings.length, kinds: [...new Set(pii.findings.map((f) => f.kind))], acknowledged: true } : null,
      supports: input.supports ?? DEFAULT_SUPPORTS,
      classId: owner.kind === "teacher" ? (input.classId ?? null) : null,
    });
    const sections = await prepareMaterial(owner, material.id, input.text);
    const fresh = await getMaterial(owner, material.id);
    return NextResponse.json({ id: fresh.id, status: fresh.status, sections }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
