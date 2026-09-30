"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/providers/session-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routes } from "@/config/routes";
import type { SessionUser } from "@/lib/auth";

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
    return <div className="h-8 w-28 shrink-0" aria-hidden />;
  }

  if (!user) {
    return (
      <Button
        asChild
        className="bg-[color-mix(in_srgb,var(--palette-teal-400)_32%,transparent)] text-white ring-[color-mix(in_srgb,var(--palette-teal-300)_45%,transparent)] hover:bg-[color-mix(in_srgb,var(--palette-teal-400)_44%,transparent)] dark:text-white"
      >
        <Link href={routes.login}>{t("signUpLogin")}</Link>
      </Button>
    );
  }

  const name = displayName(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex max-w-52 shrink-0 items-center gap-0.5 rounded-full bg-white/10 p-0.5 text-white outline-none ring-1 ring-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22)] backdrop-blur-md hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-ring/30"
        aria-label={name}
      >
        <span className="min-w-0 truncate px-2 text-xs font-medium">{name}</span>
        {user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.picture}
            alt=""
            className="size-7 shrink-0 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white">
            {initials(user)}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem
          onSelect={async () => {
            await logout();
            router.push(routes.login);
          }}
        >
          {t("logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
