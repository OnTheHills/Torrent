"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/providers/session-provider";
import { googleLogin, type SessionUser } from "@/lib/auth";
import { routes } from "@/config/routes";

function homeFor(user: SessionUser) {
  if (user.role === "admin") return routes.admin.home;
  if (user.role === "vendor") return routes.app.home;
  return routes.home;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleButton({
  role,
  afterVendor = routes.app.home,
}: {
  role?: "public" | "vendor";
  afterVendor?: string;
}) {
  const router = useRouter();
  const { refresh } = useSession();
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    let tries = 0;

    const timer = window.setInterval(() => {
      tries += 1;
      if (!window.google || !ref.current) {
        if (tries > 100) {
          window.clearInterval(timer);
          setError("Google Sign-In failed to load. Refresh the page.");
        }
        return;
      }

      window.clearInterval(timer);
      if (cancelled) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            const user = await googleLogin(credential, role);
            await refresh();
            const href =
              user.role === "vendor" ? afterVendor : homeFor(user);
            router.push(href);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Sign-in failed.");
          }
        },
      });

      window.google.accounts.id.renderButton(ref.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
      });
    }, 50);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [role, afterVendor, router, refresh, clientId]);

  const visibleError = clientId ? error : "Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID.";

  return (
    <div className="space-y-2">
      <div ref={ref} className="flex justify-center" />
      {visibleError ? (
        <p className="text-center text-sm text-destructive">{visibleError}</p>
      ) : null}
    </div>
  );
}
