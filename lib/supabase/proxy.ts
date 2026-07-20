import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

/**
 * Refreshes the Supabase auth cookies on every request so Server Components
 * always see a valid (non-expired) session. This is the App Router
 * equivalent of the standard @supabase/ssr "middleware" recipe — renamed
 * to `proxy.ts` here because Next.js 16 renamed the middleware convention
 * to Proxy (same file position, same execution model, different name).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Proxy runs on every route, including the public catalog and digimon
  // fichas, which must keep working (English-only) even when Supabase
  // isn't configured yet. Only /admin and /api/translations — which
  // actually require a session — surface the missing-env-var error.
  let env: ReturnType<typeof getSupabaseEnv>;
  try {
    env = getSupabaseEnv();
  } catch {
    return response;
  }
  const { url, publishableKey } = env;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Required by @supabase/ssr: this call revalidates the token and must not
  // be removed, even though the result isn't used directly here.
  await supabase.auth.getUser();

  return response;
}
