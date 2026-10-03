import { NextResponse, type NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

const isDev = process.env.NODE_ENV !== "production";

function buildCsp(nonce: string): string {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseWs = supabase.replace(/^http/, "ws");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${supabase} ${supabaseWs}`.trim(),
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next reads the CSP from the request to apply the nonce to its own scripts.
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (!isDev) response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  // Student and share pages must never be indexed.
  const p = request.nextUrl.pathname;
  if (p.startsWith("/c/") || p.startsWith("/r/") || p.startsWith("/go") || p.startsWith("/qr/")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return refreshSupabaseSession(request, response);
}

export const config = {
  matcher: [
    // Skip static assets; run on pages, route handlers, and server actions.
    "/((?!_next/static|_next/image|icon.svg|favicon.ico|sw.js|manifest.webmanifest|brand/|fonts/).*)",
  ],
};
