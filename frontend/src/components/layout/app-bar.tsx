"use client";

import Link from "next/link";
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
import { AppBar, chromeFrostBar } from "@/components/ui/appbar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { routes } from "@/config/routes";
import { dictionary, type DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

/**
 * Full-width chrome above the sidebar + content canvas.
 * Left: product logo. Right: account-level controls.
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

  return (
    <AppBar>
      <AppBar.Primary>
        <AppBar.Left>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={t("openMenu")}
            onClick={toggleSidebar}
            className={cn(
              chromeFrostBar,
              "hover:bg-[linear-gradient(180deg,var(--palette-gray-700),var(--palette-gray-800))] hover:brightness-125 md:hidden",
            )}
          >
            <HugeiconsIcon icon={Menu01Icon} strokeWidth={1.75} />
          </Button>
          <AppBar.MobileDivider />

          <AppBar.BrandLockup>
            <Link
              href={audience === "vendor" ? routes.app.home : routes.home}
              className="inline-flex h-12 items-center md:h-16"
            >
              <BrandLockup size="lg" priority onDark />
            </Link>
            {workspace ? (
              <AppBar.WorkspaceName className="hidden sm:flex">
                {dictionary.en[workspace]}
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
