/**
 * Centralized, validated access to the Supabase env vars. Both the browser
 * and server client factories read through here so a missing var fails with
 * one clear message instead of a cryptic "Invalid URL" deep inside
 * @supabase/ssr.
 *
 * IMPORTANT: `process.env.NEXT_PUBLIC_*` must be accessed as a static,
 * literal member expression — written out in full, right here — for
 * Next.js's client compiler to find and inline it into the browser bundle.
 * A dynamic lookup like `process.env[name]` (routing the name through a
 * variable/parameter) is invisible to that static analysis: it survives
 * untouched into client code, where there is no real `process.env` at
 * runtime, so the value silently comes back `undefined` in the browser
 * even though the server (plain Node, no inlining needed) reads it fine.
 * That mismatch — worked on the server, failed only in the browser — is
 * exactly what a dynamic-access regression here looks like.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL. Copiá .env.example a .env.local y completá los valores de tu proyecto Supabase (Project Settings → API Keys).",
    );
  }
  if (!publishableKey) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copiá .env.example a .env.local y completá los valores de tu proyecto Supabase (Project Settings → API Keys).",
    );
  }

  return { url, publishableKey };
}
