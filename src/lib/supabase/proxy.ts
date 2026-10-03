import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the auth cookies on every request. Nothing may run between client
// creation and getClaims(), per Supabase's SSR guidance.
export async function refreshSupabaseSession(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  let result = response;
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        result = NextResponse.next({ request });
        for (const [k, v] of response.headers) result.headers.set(k, v);
        for (const { name, value, options } of toSet) result.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getClaims();
  return result;
}
