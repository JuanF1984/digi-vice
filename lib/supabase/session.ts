import { createClient } from "./server";

/**
 * Optimistic-only check (decoded from the session cookie, not re-verified
 * against the Supabase Auth server) used purely to decide whether a digimon
 * ficha should even attempt to POST a freshly Chrome-translated description
 * to /api/translations. It is never used to authorize the write itself —
 * that Route Handler re-verifies with `getUser()` and Postgres RLS does the
 * real enforcement. See the "Optimistic vs secure checks" guidance in the
 * Next.js authentication docs.
 *
 * Missing Supabase config or a transient error degrades to "no session"
 * instead of breaking the public ficha — translations are a bonus, not a
 * requirement for the page to render.
 */
export async function hasOptimisticSession(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return Boolean(session);
  } catch (error) {
    console.error("[digidesk] no se pudo verificar la sesión", error);
    return false;
  }
}
