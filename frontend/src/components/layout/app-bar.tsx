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
import { AppBar } from "@/components/ui/appbar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { routes } from "@/config/routes";
import { dictionary, type DictionaryKey } from "@/lib/i18n/dictionary";

/**
 * Full-width chrome above the sidebar + content canvas.
 * Left: product logo. Right: account-level controls.
 * Sidebar collapse lives in the sidebar footer; mobile gets a menu button only.
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
            className="text-appbar-muted-foreground hover:bg-appbar-hover hover:text-appbar-foreground md:hidden"
          >
            <HugeiconsIcon icon={Menu01Icon} strokeWidth={1.75} />
          </Button>
          <AppBar.MobileDivider />

          <AppBar.BrandLockup>
            <Link
              href={audience === "vendor" ? routes.app.home : routes.home}
              className="inline-flex h-12 items-center md:h-16"
            >
              <BrandLockup size="lg" priority />
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
