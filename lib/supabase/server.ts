import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/**
 * Server-side Supabase client for Server Components and Route Handlers —
 * reads the session from request cookies and (when called from a Route
 * Handler) can refresh them. Call this fresh wherever it's needed; it's a
 * cheap factory, not a connection to hold onto.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component render, where cookies can't be
          // written — proxy.ts refreshes the session on the next request.
        }
      },
    },
  });
}
