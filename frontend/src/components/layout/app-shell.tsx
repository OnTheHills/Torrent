"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

import { ShellAppBar } from "@/components/layout/app-bar";
import { useLocale } from "@/components/providers/locale-provider";
import {
  MainContent,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import type { NavGroup } from "@/config/navigation";
import { routes } from "@/config/routes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

/**
 * Mint-style shell: frosted 72px App Bar over a Sidebar and a flush
 * content canvas. Chrome overlays the canvas so backdrop-filter can sample it.
 * The canvas is the only page scroll container. Page content uses Surface /
 * Card on that canvas (or on a HomeBand fill).
 */
export function AppShell({
  nav,
  workspace,
  showBackToSite = false,
  inset = false,
  fullBleedPaths = [],
  children,
}: {
  nav: NavGroup[];
  workspace?: DictionaryKey;
  showBackToSite?: boolean;
  /** Pad and centre the canvas contents — for pages without full-bleed sections. */
  inset?: boolean;
  /** Exact paths that skip `inset` because they render their own full-bleed hero. */
  fullBleedPaths?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const padded = inset && !fullBleedPaths.includes(pathname);

  return (
    <SidebarProvider className="relative flex h-dvh flex-col overflow-hidden shell-atmosphere">
      <ShellAppBar workspace={workspace} />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ShellSidebar nav={nav} showBackToSite={showBackToSite} />
        <MainContent>
          {padded ? (
            <div className="mx-auto max-w-6xl px-5 py-8 md:px-12 md:py-12">
              {children}
            </div>
          ) : (
            children
          )}
        </MainContent>
      </div>
    </SidebarProvider>
  );
}

function ShellSidebar({
  nav,
  showBackToSite,
}: {
  nav: NavGroup[];
  showBackToSite: boolean;
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { isMobile, setOpenMobile } = useSidebar();

  // The drawer overlays the canvas, so leaving it open after navigation would
  // hide the page the user just asked for.
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  return (
    <Sidebar>
      <SidebarContent>
        {nav.map((group) => (
          <SidebarGroup key={group.labelKey}>
            <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const label = t(item.labelKey);
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.href} aria-current={active ? "page" : undefined}>
                        <HugeiconsIcon icon={item.icon} strokeWidth={1.75} />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {showBackToSite ? (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={routes.home}>
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.75} />
                  <span>{t("backToSite")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      ) : null}
    </Sidebar>
  );
}
