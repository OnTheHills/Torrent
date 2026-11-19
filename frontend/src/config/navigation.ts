import {
  File01Icon,
  HeartIcon,
  Home03Icon,
  MoneyBag02Icon,
  Pulse01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

import { routes } from "@/config/routes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

export type LucideNavIcon =
  | "layout-grid"
  | "monitor-activity"
  | "users"
  | "user"
  | "message-circle"
  | "chart-pie"
  | "funnel"
  | "clipboard-pen"
  | "archive"
  | "list-ordered";

export type NavItem = {
  labelKey: DictionaryKey;
  href: string;
  icon?: IconSvgElement;
  lucide?: LucideNavIcon;
  /**
   * Section index routes (`/`, `/app`, `/admin`) are prefixes of their children,
   * so they only highlight on an exact match.
   */
  exact?: boolean;
};

export type NavGroup = {
  /** Omit to hide the section heading in the sidebar. */
  labelKey?: DictionaryKey;
  items: NavItem[];
  /** Pin this group to the sidebar footer (above collapse). */
  dock?: "bottom";
};

/** Public monitor — civic transparency, not a vendor bid desk. */
export const PUBLIC_NAV: NavGroup[] = [
  {
    items: [
      { labelKey: "navHome", href: routes.home, icon: Home03Icon, exact: true },
      { labelKey: "navMonitor", href: routes.monitor, icon: Pulse01Icon },
      { labelKey: "navListings", href: routes.tors, icon: File01Icon },
      { labelKey: "navBudgets", href: routes.dashboard, icon: MoneyBag02Icon },
    ],
  },
];

export const VENDOR_NAV: NavGroup[] = [
  {
    labelKey: "navGroupCatalog",
    items: [
      {
        labelKey: "navHome",
        href: routes.app.landing,
        icon: Home03Icon,
        exact: true,
      },
      { labelKey: "navCatalog", href: routes.app.tors, icon: File01Icon },
      {
        labelKey: "navBudgets",
        href: routes.app.dashboard,
        lucide: "chart-pie",
      },
    ],
  },
  {
    labelKey: "navGroupInbox",
    items: [
      {
        labelKey: "navInbox",
        href: routes.app.home,
        icon: SparklesIcon,
        exact: true,
      },
      { labelKey: "navWatchlist", href: routes.app.saved, icon: HeartIcon },
    ],
  },
  {
    labelKey: "navGroupAccount",
    dock: "bottom",
    items: [
      {
        labelKey: "navProfile",
        href: routes.app.profile,
        lucide: "user",
      },
      {
        labelKey: "navAlerts",
        href: routes.app.alerts,
        lucide: "message-circle",
      },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    labelKey: "navGroupWorkspace",
    items: [
      {
        labelKey: "navOverview",
        href: routes.admin.home,
        lucide: "layout-grid",
        exact: true,
      },
      {
        labelKey: "navAdminSources",
        href: routes.admin.sources,
        lucide: "monitor-activity",
      },
      {
        labelKey: "navAdminTors",
        href: routes.admin.tors,
        lucide: "archive",
      },
      {
        labelKey: "navAdminReview",
        href: routes.admin.review,
        lucide: "clipboard-pen",
      },
      {
        labelKey: "navAdminMatches",
        href: routes.admin.matches,
        icon: SparklesIcon,
      },
    ],
  },
  {
    labelKey: "navGroupTools",
    dock: "bottom",
    items: [
      {
        labelKey: "navAdminUsers",
        href: routes.admin.users,
        lucide: "users",
      },
      {
        labelKey: "navAdminSettings",
        href: routes.admin.settings,
        lucide: "funnel",
      },
      {
        labelKey: "navAdminAudit",
        href: routes.admin.audit,
        lucide: "list-ordered",
      },
    ],
  },
];
