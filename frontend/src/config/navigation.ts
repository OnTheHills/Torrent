import {
  Analytics01Icon,
  Award01Icon,
  Bookmark02Icon,
  File01Icon,
  Home01Icon,
  Notification03Icon,
  Pulse01Icon,
  Shield01Icon,
  StarIcon,
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
  labelKey: DictionaryKey;
  items: NavItem[];
};

/** Public monitor — civic transparency, not a vendor bid desk. */
export const PUBLIC_NAV: NavGroup[] = [
  {
    labelKey: "navGroupMonitor",
    items: [
      { labelKey: "navHome", href: routes.home, icon: Home01Icon, exact: true },
      { labelKey: "navMonitor", href: routes.monitor, icon: Pulse01Icon },
      { labelKey: "navListings", href: routes.tors, icon: File01Icon },
      { labelKey: "navBudgets", href: routes.dashboard, icon: Analytics01Icon },
      { labelKey: "navApproaches", href: routes.showcase, icon: Award01Icon },
    ],
  },
];

export const VENDOR_NAV: NavGroup[] = [
  {
    labelKey: "navGroupInbox",
    items: [
      {
        labelKey: "navInbox",
        href: routes.app.home,
        icon: Home01Icon,
        exact: true,
      },
      { labelKey: "navMatches", href: routes.app.matches, icon: StarIcon },
      { labelKey: "navWatchlist", href: routes.app.saved, icon: Bookmark02Icon },
    ],
  },
  {
    labelKey: "navGroupCatalog",
    items: [{ labelKey: "navCatalog", href: routes.app.tors, icon: File01Icon }],
  },
  {
    labelKey: "navGroupAccount",
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
    ],
  },
];
