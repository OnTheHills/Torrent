"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/components/providers/locale-provider";
import { useSession } from "@/components/providers/session-provider";
import { googleLogin, type SessionUser } from "@/lib/auth";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/** Same translucent white frost as hero cards. */
const frostButton =
  "border-0 bg-[rgb(255_255_255_/_0.22)] text-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.7),0_8px_28px_rgb(0_0_0_/_0.05)] ring-1 ring-[rgb(255_255_255_/_0.48)] backdrop-blur-xl backdrop-saturate-150";

function homeFor(user: SessionUser) {
  if (user.role === "admin") return routes.admin.home;
  if (user.role === "vendor") return routes.app.home;
  return routes.home;
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      width="18"
      height="18"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
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
  const readyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const roleRef = useRef(role);

  // The Google callback must submit the role currently highlighted in React.
  useLayoutEffect(() => {
    roleRef.current = role;
  }, [role]);

  // The Google script is loaded by the root layout. Poll briefly because this
  // client component may mount before Google's global object is available.
  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    let tries = 0;
    readyRef.current = false;

    const paint = () => {
      const host = ref.current;
      const google = window.google;
      // GSI throws if renderButton runs before initialize().
      if (!host || !google || !readyRef.current) return;
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
            const user = await googleLogin(credential, roleRef.current);
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
      readyRef.current = true;
      paint();
    }, 50);

    const observer = new ResizeObserver(() => paint());
    if (ref.current) observer.observe(ref.current);

    return () => {
      cancelled = true;
      readyRef.current = false;
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, [afterVendor, router, refresh, clientId, t]);

  // A later React render drops the nodes Google injects. Put the button back
  // before the browser paints — only after initialize() has run.
  useLayoutEffect(() => {
    paintRef.current();
  });

  const visibleError = clientId ? error : "Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID.";

  return (
    <div className="space-y-2">
      <div className="relative h-10 w-full">
        {/* Visible frost chrome; Google iframe sits on top for clicks. */}
        <div
          aria-hidden
          className={cn(
            frostButton,
            "pointer-events-none absolute inset-0 flex items-center justify-center gap-2.5 rounded-full px-4 text-sm font-medium",
          )}
        >
          <GoogleMark className="size-[18px] shrink-0" />
          Continue with Google
        </div>
        <div
          ref={ref}
          className={cn(
            "absolute inset-0 z-10 overflow-hidden rounded-full opacity-[0.02]",
            "[&_div]:!h-full [&_div]:!w-full",
            "[&_iframe]:!h-full [&_iframe]:!w-full [&_iframe]:!rounded-full",
          )}
        />
      </div>
      {visibleError ? (
        <p className="text-center text-sm text-destructive">{visibleError}</p>
      ) : null}
    </div>
  );
}
