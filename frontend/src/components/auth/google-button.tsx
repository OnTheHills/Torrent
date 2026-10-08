"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/components/providers/locale-provider";
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
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const paintRef = useRef<() => void>(() => {});
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // The Google script is loaded by the root layout. Poll briefly because this
  // client component may mount before Google's global object is available.
  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    let tries = 0;

    const paint = () => {
      const host = ref.current;
      const google = window.google;
      if (!host || !google) return;
      const width = Math.min(400, Math.round(host.getBoundingClientRect().width));
      if (width < 200) return;
      const current = host.querySelector("iframe");
      if (current && host.dataset.buttonWidth === String(width)) return;
      host.dataset.buttonWidth = String(width);
      host.replaceChildren();
      google.accounts.id.renderButton(host, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width,
        text: "continue_with",
      });
    };
    paintRef.current = paint;

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
            const code =
              err instanceof Error && "code" in err && typeof err.code === "string"
                ? err.code
                : "";
            if (code === "email_registered") setError(t("emailAlreadyRegistered"));
            else if (code === "email_unknown") setError(t("emailNotRegistered"));
            else setError(err instanceof Error ? err.message : "Sign-in failed.");
          }
        },
      });

      paint();
    }, 50);

    const observer = new ResizeObserver(() => paint());
    if (ref.current) observer.observe(ref.current);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, [role, afterVendor, router, refresh, clientId, t]);

  // A later React render drops the nodes Google injects. Put the button back
  // before the browser paints.
  useLayoutEffect(() => {
    paintRef.current();
  });

  const visibleError = clientId ? error : "Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID.";

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        className="w-full overflow-hidden rounded-full [&_iframe]:block [&_iframe]:w-full [&_iframe]:rounded-full"
      />
      {visibleError ? (
        <p className="text-center text-sm text-destructive">{visibleError}</p>
      ) : null}
    </div>
  );
}
