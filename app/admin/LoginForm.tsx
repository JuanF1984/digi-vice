"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side login only — the browser Supabase client writes the session
 * to cookies, which the server client (used to render this same route)
 * then reads. There is no separate "admin password" here: Supabase Auth is
 * the only source of truth, and RLS is what actually gates writes.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("[digidesk] admin login failed", signInError.message);
        setError("No se pudo iniciar sesión. Revisá el email y la contraseña.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="email" className="block text-xs uppercase tracking-widest text-bone-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-screen-line bg-screen-raised px-3 py-2 text-sm text-bone"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="block text-xs uppercase tracking-widest text-bone-muted">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-screen-line bg-screen-raised px-3 py-2 text-sm text-bone"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg border border-phosphor/40 px-4 py-2 text-sm font-medium text-phosphor transition-colors hover:bg-phosphor/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Verificando…" : "Ingresar"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
