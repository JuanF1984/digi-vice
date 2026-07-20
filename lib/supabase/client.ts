import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Browser-side Supabase client — used for login/logout and any other
 * interactive auth state. Session cookies written here are readable by the
 * server client below, since @supabase/ssr keeps both in sync via cookies
 * instead of localStorage.
 */
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
