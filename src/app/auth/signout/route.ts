import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { hasSupabase } from "@/lib/env";
import { MOCK_SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  if (hasSupabase()) {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  const store = await cookies();
  store.delete(MOCK_SESSION_COOKIE);
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), { status: 303 });
}
