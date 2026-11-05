"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";

import { AccountControl } from "@/components/layout/account-control";
import { BrandLockup } from "@/components/layout/brand-lockup";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ViewToggle } from "@/components/layout/view-toggle";
import { AlertsPopover } from "@/components/notifications/alerts-popover";
import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { useSession } from "@/components/providers/session-provider";
import {
  AppBar,
  appBarWorkspaceTone,
  chromeFrostBar,
} from "@/components/ui/appbar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { routes } from "@/config/routes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Full-bleed 72px chrome above the sidebar + content canvas, with liquid-glass
 * fill. Left: product logo. Right: account-level controls.
 * Mobile gets a menu button that opens the navigation drawer.
 */
export function ShellAppBar({
  workspace,
}: {
  workspace?: DictionaryKey;
}) {
  const { t } = useLocale();
  const audience = useAudience();
  const { user } = useSession();
  const { toggleSidebar } = useSidebar();
  const showAlerts = audience === "vendor";
  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor-profile", user?._id],
    enabled: audience === "vendor" && Boolean(user),
    queryFn: async () => {
      try {
        return await api<{ vendorName?: string } | null>(
          `/vendor-profiles/get/${user!._id}`,
        );
      } catch (error) {
        if ((error as { status?: number }).status === 404) return null;
        throw error;
      }
    },
    retry: false,
  });
  const vendorName = audience === "vendor" && user
    ? vendorProfile?.vendorName?.trim()
    : undefined;

  return (
    <AppBar>
      <AppBar.Primary>
        <AppBar.Left className="min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={t("openMenu")}
            onClick={toggleSidebar}
            className={cn(
              chromeFrostBar,
              "hover:brightness-[1.02] md:hidden",
            )}
          >
            <HugeiconsIcon icon={Menu01Icon} strokeWidth={1.75} />
          </Button>
          <AppBar.MobileDivider />

          <AppBar.BrandLockup className="min-w-0">
            <Link
              href={audience === "vendor" ? routes.app.home : routes.home}
              className="inline-flex h-12 min-w-0 items-center gap-1 md:h-16 md:gap-1.5"
            >
              {/* Clip the wordmark from the combined asset, keeping its icon. */}
              <span
                aria-hidden="true"
                className="h-14 w-6 shrink-0 overflow-hidden md:h-20 md:w-[35px]"
              >
                <BrandLockup size="xl" priority className="max-w-none" />
              </span>
              <span
                title={vendorName || t("brand")}
                className="max-w-[32vw] truncate font-heading text-2xl leading-none font-black tracking-[-0.05em] text-[#282828] md:max-w-md md:text-[34px]"
              >
                {vendorName || t("brand")}
              </span>
            </Link>
            {workspace ? (
              <AppBar.WorkspaceName
                className={cn(
                  "ml-1 hidden sm:inline-flex",
                  appBarWorkspaceTone[audience],
                )}
              >
                {audience === "public"
                  ? "Public"
                  : audience === "vendor"
                    ? "Vendor"
                    : "Admin"}
              </AppBar.WorkspaceName>
            ) : null}
          </AppBar.BrandLockup>
        </AppBar.Left>

        <AppBar.Right className="shrink-0 gap-2 md:gap-3">
          {showAlerts ? <AlertsPopover tone="chrome" /> : null}
          {!user ? <ViewToggle tone="chrome" className="hidden sm:inline-flex" /> : null}
          <LocaleToggle tone="chrome" />
          <AccountControl />
        </AppBar.Right>
      </AppBar.Primary>
    </AppBar>
  );
}
