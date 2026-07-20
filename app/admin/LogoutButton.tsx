"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="rounded-lg border border-screen-line px-4 py-2 text-sm text-bone-muted transition-colors hover:bg-screen-raised disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
  );
}
