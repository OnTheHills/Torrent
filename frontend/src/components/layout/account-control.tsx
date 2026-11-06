"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logout03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useSession } from "@/components/providers/session-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { chromeFrostBar, chromeFrostGlazeDim } from "@/components/ui/appbar";
import {
  FrostPopup,
  FrostPopupContent,
  FrostPopupItem,
  FrostPopupTrigger,
} from "@/components/ui/frost-popup";
import { routes } from "@/config/routes";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

function displayName(user: SessionUser) {
  const full = [user.firstname, user.lastname].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user.username) return user.username;
  return user.email.split("@")[0];
}

function initials(user: SessionUser) {
  const name = displayName(user);
  return name.slice(0, 1).toUpperCase();
}

export function AccountControl() {
  const { t } = useLocale();
  const { user, loading, logout } = useSession();
  const router = useRouter();

  if (loading) {
    return <div className="h-9 w-28 shrink-0" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href={routes.login}
        className={cn(
          chromeFrostGlazeDim,
          "inline-flex h-9 shrink-0 items-center justify-center rounded-full px-4 text-sm font-medium",
          "transition-[transform,background] duration-200 ease-out",
          "hover:-translate-y-0.5",
          "motion-reduce:transition-none motion-reduce:hover:transform-none",
        )}
      >
        {t("signUpLogin")}
      </Link>
    );
  }

  const name = displayName(user);

  return (
    <FrostPopup>
      <FrostPopupTrigger
        className={cn(
          chromeFrostBar,
          "inline-flex h-9 max-w-52 shrink-0 items-center gap-0.5 rounded-full p-0.5 outline-none hover:brightness-[1.02] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] data-[state=open]:bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] data-[state=open]:ring-1 data-[state=open]:ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] data-[state=open]:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)]",
        )}
        aria-label={name}
      >
        <span className="min-w-0 truncate px-2.5 text-xs font-medium">{name}</span>
        {user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.picture}
            alt=""
            className="size-8 shrink-0 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--palette-gray-400)_28%,transparent)] text-[10px] font-semibold text-foreground">
            {initials(user)}
          </span>
        )}
      </FrostPopupTrigger>
      <FrostPopupContent>
        <FrostPopupItem
          onSelect={async () => {
            await logout();
            router.push(routes.login);
          }}
        >
          <HugeiconsIcon
            icon={Logout03Icon}
            strokeWidth={1.75}
            className="size-3.5"
          />
          {t("logOut")}
        </FrostPopupItem>
      </FrostPopupContent>
    </FrostPopup>
  );
}
