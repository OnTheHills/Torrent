"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { frostButton } from "@/components/admin/admin-ui";
import { useSession } from "@/components/providers/session-provider";
import { routes } from "@/config/routes";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function subscribe() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function DevAdminShortcut() {
  const router = useRouter();
  const { refresh } = useSession();
  const isClient = useIsClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (process.env.NODE_ENV === "production" || !isClient) return null;

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
        <p className="max-w-56 rounded-lg bg-white px-3 py-2 text-xs font-medium text-[var(--palette-red-700)] shadow-md ring-1 ring-[color-mix(in_srgb,var(--palette-red-400)_40%,transparent)]">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={openAdmin}
        disabled={pending}
        className={cn(
          frostButton,
          "inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition-transform duration-200 ease-out hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:transform-none",
        )}
      >
        {pending ? "Opening…" : "Open admin"}
      </button>
    </div>,
    document.body,
  );
}
