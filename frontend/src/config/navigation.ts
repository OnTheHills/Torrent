import {
  Alert02Icon,
  Analytics01Icon,
  File01Icon,
  HeartIcon,
  Home03Icon,
  MoneyBag02Icon,
  Notification03Icon,
  Pulse01Icon,
  Shield01Icon,
  SourceCodeIcon,
  SparklesIcon,
  UserSettings01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

import { routes } from "@/config/routes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

export type NavItem = {
  labelKey: DictionaryKey;
  href: string;
  icon: IconSvgElement;
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
    labelKey: "navGroupInbox",
    items: [
      {
        labelKey: "navHome",
        href: routes.app.landing,
        icon: Home03Icon,
        exact: true,
      },
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
    labelKey: "navGroupCatalog",
    items: [
      { labelKey: "navCatalog", href: routes.app.tors, icon: File01Icon },
      {
        labelKey: "navBudgets",
        href: routes.app.dashboard,
        icon: MoneyBag02Icon,
      },
    ],
  },
  {
    labelKey: "navGroupAccount",
    dock: "bottom",
    items: [
      {
        labelKey: "navProfile",
        href: routes.app.profile,
        icon: UserSettings01Icon,
      },
      {
        labelKey: "navAlerts",
        href: routes.app.alerts,
        icon: Notification03Icon,
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
        icon: Shield01Icon,
        exact: true,
      },
      {
        labelKey: "navAdminSources",
        href: routes.admin.sources,
        icon: Pulse01Icon,
      },
      {
        labelKey: "navAdminReview",
        href: routes.admin.review,
        icon: Alert02Icon,
      },
      { labelKey: "navAdminTors", href: routes.admin.tors, icon: File01Icon },
    ],
  },
  {
    labelKey: "navGroupTools",
    items: [
      {
        labelKey: "navAdminMatches",
        href: routes.admin.matches,
        icon: SparklesIcon,
      },
      {
        labelKey: "navAdminAudit",
        href: routes.admin.audit,
        icon: Analytics01Icon,
      },
    ],
  },
  {
    labelKey: "navGroupAccount",
    dock: "bottom",
    items: [
      {
        labelKey: "navAdminUsers",
        href: routes.admin.users,
        icon: UserSettings01Icon,
      },
      {
        labelKey: "navAdminSettings",
        href: routes.admin.settings,
        icon: SourceCodeIcon,
      },
    ],
  },
];
