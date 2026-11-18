"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ComponentType } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Archive,
  ChartPie,
  ClipboardPen,
  Funnel,
  LayoutGrid,
  ListOrdered,
  MessageCircle,
  Maximize2,
  Minimize2,
  MonitorActivity,
  User,
  Users,
} from "lucide-react";

import { ShellAppBar } from "@/components/layout/app-bar";
import { ShellContent } from "@/components/layout/shell-content";
import { SiteFooter } from "@/components/layout/site-footer";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
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
import type { LucideNavIcon, NavGroup, NavItem } from "@/config/navigation";
import { routes } from "@/config/routes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { torsQueryOptions } from "@/lib/tors-query";
import { cn } from "@/lib/utils";

const LUCIDE_NAV_ICONS: Record<
  LucideNavIcon,
  ComponentType<{ strokeWidth?: number; fill?: string; className?: string }>
> = {
  "layout-grid": LayoutGrid,
  "monitor-activity": MonitorActivity,
  users: Users,
  user: User,
  "message-circle": MessageCircle,
  "chart-pie": ChartPie,
  funnel: Funnel,
  "clipboard-pen": ClipboardPen,
  archive: Archive,
  "list-ordered": ListOrdered,
};

/** Icons that blob if fully filled — paint only the named slice. */
const LUCIDE_ACTIVE_SLICE: Partial<Record<LucideNavIcon, string>> = {
  "chart-pie": "[&_path:first-of-type]:fill-current",
  "clipboard-pen": "[&_path:nth-of-type(2)]:fill-current",
  /* Lid only — box body stays outline. */
  archive: "[&_rect]:fill-current",
  /* Screen fills; activity stroke punches through with the active pill color. */
  "monitor-activity":
    "[&_rect]:fill-current [&_path:nth-of-type(2)]:relative [&_path:nth-of-type(2)]:z-[1] [&_path:nth-of-type(2)]:stroke-sidebar-accent",
};

/** Icons that stay outline when active — just a heavier stroke (+1). */
const LUCIDE_ACTIVE_STROKE: Partial<Record<LucideNavIcon, number>> = {
  "list-ordered": 2.75,
};

function isListingsHref(href: string) {
  return (
    href === routes.tors ||
    href === routes.app.tors ||
    href === routes.admin.tors
  );
}

/** Neutral frost control for the light liquid-glass sidebar. */
const sidebarFrostButton =
  "border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] hover:brightness-[1.02]";

/**
 * Mint-style shell: frosted 72px App Bar over a Sidebar and a flush
 * content canvas. Chrome overlays the canvas so backdrop-filter can sample it.
 * The canvas is the only page scroll container. Page content uses Surface /
 * Card on that canvas (or on a HomeBand fill).
 */
export function AppShell({
  nav,
  workspace,
  inset = false,
  fullBleedPaths = [],
  children,
}: {
  nav: NavGroup[];
  workspace?: DictionaryKey;
  /** Pad and centre the canvas contents — for pages without full-bleed sections. */
  inset?: boolean;
  /** Exact paths that skip `inset` because they render their own full-bleed hero. */
  fullBleedPaths?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const fullBleed = fullBleedPaths.some((path) => {
    if (pathname === path) return true;
    // `/app` is only the vendor home. Nested pages opt in with their own path.
    if (path === "/app") return false;
    return pathname.startsWith(`${path}/`);
  });
  const padded = inset && !fullBleed;

  return (
    <SidebarProvider className="relative flex h-dvh flex-col overflow-hidden bg-background">
      <ShellAppBar workspace={workspace} />
      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-background">
        <ShellSidebar nav={nav} />
        <MainContent>
          {padded ? (
            <ShellContent>
              <div className="mx-auto max-w-6xl px-5 py-8 md:px-12 md:py-12">
                {children}
              </div>
            </ShellContent>
          ) : (
            children
          )}
        </MainContent>
      </div>
    </SidebarProvider>
  );
}

function NavGroupBlock({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const { t } = useLocale();

  return (
    <SidebarGroup>
      {group.labelKey ? (
        <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
      ) : null}
      <SidebarMenu>
        {group.items.map((item) => (
          <NavItemRow key={item.href} item={item} pathname={pathname} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavItemRow({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const label = t(item.labelKey);
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const prefetchListings = isListingsHref(item.href)
    ? () => {
        void queryClient.prefetchQuery(torsQueryOptions);
      }
    : undefined;
  const LucideIcon = item.lucide ? LUCIDE_NAV_ICONS[item.lucide] : null;
  const lucideSlice = item.lucide ? LUCIDE_ACTIVE_SLICE[item.lucide] : undefined;
  const lucideHeavy = item.lucide ? LUCIDE_ACTIVE_STROKE[item.lucide] : undefined;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={label}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          aria-label={label}
          onMouseEnter={prefetchListings}
          onFocus={prefetchListings}
          onTouchStart={prefetchListings}
        >
          {LucideIcon ? (
            <LucideIcon
              strokeWidth={active && lucideHeavy ? lucideHeavy : 1.75}
              fill={
                active && !lucideSlice && !lucideHeavy
                  ? "currentColor"
                  : "none"
              }
              className={active ? lucideSlice : undefined}
            />
          ) : item.icon ? (
            <HugeiconsIcon
              icon={item.icon}
              strokeWidth={1.75}
              className={active ? "[&_path]:fill-current" : undefined}
            />
          ) : null}
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function ShellSidebar({ nav }: { nav: NavGroup[] }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const { open, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const mainNav = nav.filter((group) => group.dock !== "bottom");
  const bottomNav = nav.filter((group) => group.dock === "bottom");
  const hasListingsNav = nav.some((group) =>
    group.items.some((item) => isListingsHref(item.href)),
  );

  // The drawer overlays the canvas, so leaving it open after navigation would
  // hide the page the user just asked for.
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  // Warm the TOR catalog in the background so Listings opens from cache.
  useEffect(() => {
    if (!hasListingsNav) return;
    const timer = window.setTimeout(() => {
      void queryClient.prefetchQuery(torsQueryOptions);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [hasListingsNav, queryClient]);

  return (
    <Sidebar>
      <SidebarContent>
        {mainNav.map((group) => (
          <NavGroupBlock
            key={group.labelKey ?? group.items[0]?.href ?? "nav"}
            group={group}
            pathname={pathname}
          />
        ))}
      </SidebarContent>

      <SidebarFooter>
        {bottomNav.map((group) => (
          <NavGroupBlock
            key={group.labelKey ?? group.items[0]?.href ?? "nav-bottom"}
            group={group}
            pathname={pathname}
          />
        ))}
        {!isMobile ? (
          <Button
            type="button"
            variant="ghost"
            aria-label={open ? t("collapseMenu") : t("expandMenu")}
            title={open ? t("collapseMenu") : t("expandMenu")}
            onClick={toggleSidebar}
            className={cn(
              sidebarFrostButton,
              "gap-3 rounded-full text-sm font-medium [&_svg]:size-4.5",
              open
                ? "h-10 w-full justify-start pl-4 pr-3"
                : "mx-auto h-12 w-10 shrink-0 justify-center px-0",
            )}
          >
            {open ? (
              <Minimize2 strokeWidth={1.75} className="size-4.5 shrink-0" />
            ) : (
              <Maximize2 strokeWidth={1.75} className="size-4.5 shrink-0" />
            )}
            {open ? <span>{t("collapseMenu")}</span> : null}
          </Button>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
