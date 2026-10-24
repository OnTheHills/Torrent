"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/providers/session-provider";
import { routes } from "@/config/routes";
import { api } from "@/lib/api";

export function DevAdminShortcut() {
  const router = useRouter();
  const { refresh } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (process.env.NODE_ENV === "production" || !mounted) return null;

  async function openAdmin() {
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/dev-admin", { method: "POST" });
      await refresh();
      router.push(routes.admin.home);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open admin");
      setPending(false);
    }
  }

  return createPortal(
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
      {error ? (
        <p className="max-w-56 rounded-lg bg-white/90 px-3 py-2 text-xs text-[var(--palette-red-700)] shadow-sm">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={openAdmin}
        disabled={pending}
        className="h-8 rounded-full border-0 bg-[color-mix(in_srgb,var(--palette-teal-400)_32%,transparent)] px-3.5 text-xs font-medium text-[var(--palette-teal-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)] backdrop-blur-md disabled:opacity-50"
      >
        {pending ? "Opening…" : "Open admin"}
      </button>
    </div>,
    document.body,
  );
}
