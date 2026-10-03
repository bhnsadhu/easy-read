import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { RateLimitedError } from "./limits";
import { ConflictError, NotFoundError } from "./data/types";
import { LlmError } from "./llm";

export type ApiErrorBody = { error: { code: string; message: string } };

export function jsonError(code: string, message: string, status: number, extra?: Record<string, unknown>): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message }, ...extra }, { status });
}

export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return ip.slice(0, 64);
}

// Maps internal errors to teacher-facing messages: what happened, what to do next.
export function errorResponse(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof RateLimitedError) {
    const res = jsonError("rate_limited", err.userMessage, 429);
    res.headers.set("Retry-After", String(err.retryAfterSeconds));
    return res;
  }
  if (err instanceof NotFoundError) return jsonError("not_found", "We couldn't find that. It may have been removed.", 404);
  if (err instanceof ConflictError) {
    return jsonError("conflict", "This was changed in another tab. Reload to see the latest version before editing.", 409);
  }
  if (err instanceof LlmError) {
    const message =
      err.code === "rate_limited" || err.code === "timeout" || err.code === "unavailable"
        ? "The AI service is busy right now. We'll keep retrying. If this keeps happening, try again in a few minutes."
        : err.code === "too_large"
          ? "This material is too long to adapt in one go. Try splitting it into smaller parts."
          : "We couldn't adapt this part. You can regenerate it or keep the original.";
    return jsonError(`llm_${err.code}`, message, 502);
  }
  if (err && typeof err === "object" && "userMessage" in err && typeof (err as { userMessage: unknown }).userMessage === "string") {
    const e = err as { code?: string; userMessage: string };
    return jsonError(e.code ?? "ingest_error", e.userMessage, 422);
  }
  if (err instanceof Error && err.message === "UNAUTHENTICATED") {
    return jsonError("unauthenticated", "Sign in to continue. We'll email you a link.", 401);
  }
  console.error("[api] unexpected error", err instanceof Error ? { name: err.name, message: err.message } : err);
  return jsonError("internal", "Something went wrong on our side. Try again in a moment.", 500);
}

export async function readJson<T>(request: NextRequest, maxBytes = 1_000_000): Promise<T> {
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw Object.assign(new Error("too large"), { code: "too_large", userMessage: "That request was too large." });
  return (await request.json()) as T;
}
