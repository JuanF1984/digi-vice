import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";
import { LogoutButton } from "./LogoutButton";

/**
 * Deliberately discreet: not linked from DeviceHeader or any nav, and kept
 * out of search indexes. It carries no security of its own — a visitor who
 * finds this URL still can't write anything without a valid Supabase
 * session for the one authorized account, enforced by RLS.
 */
export const metadata: Metadata = {
  title: "DigiDesk — Panel",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="circuit-texture min-h-screen bg-chassis">
      <main className="mx-auto flex min-h-screen w-full max-w-sm items-center px-4">
        <div className="w-full space-y-6 rounded-xl border border-screen-line bg-screen-raised p-6">
          <h1 className="font-data text-[11px] uppercase tracking-[0.2em] text-bone-muted">
            DigiDesk — Panel
          </h1>

          {user ? (
            <div className="space-y-4">
              <p className="font-body text-sm text-bone">
                Sesión activa como <strong>{user.email}</strong>. Usuario
                autorizado.
              </p>
              <LogoutButton />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="font-body text-sm text-bone-muted">
                Iniciá sesión con la cuenta autorizada para guardar
                traducciones.
              </p>
              <LoginForm />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
