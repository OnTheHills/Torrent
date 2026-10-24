import type { AgencyId } from "@/config/agencies";

export const routes = {
  home: "/",
  monitor: "/monitor",
  tors: "/tors",
  tor: (id: string) => `/tors/${id}`,
  notifications: "/app/alerts",
  settings: {
    notifications: "/app/alerts",
  },
  saved: "/app/saved",
  dashboard: "/dashboard",
  login: "/login",
  register: "/register",
  app: {
    home: "/app",
    tors: "/app/tors",
    tor: (id: string) => `/app/tors/${id}`,
    matches: "/app/matches",
    dashboard: "/app/dashboard",
    saved: "/app/saved",
    alerts: "/app/alerts",
    profile: "/app/profile",
  },
  admin: {
    home: "/admin",
    sources: "/admin/sources",
    review: "/admin/review",
    reviewItem: (id: string) => `/admin/review/${id}`,
    tors: "/admin/tors",
    tor: (id: string) => `/admin/tors/${id}`,
    audit: "/admin/audit",
    users: "/admin/users",
    matches: "/admin/matches",
    settings: "/admin/settings",
  },
} as const;

export function listingHref(
  id: string,
  audience: "public" | "vendor" | "admin",
  from?: "matches",
) {
  const path = audience === "vendor" ? routes.app.tor(id) : routes.tor(id);
  if (from === "matches" && audience === "vendor") return `${path}?from=matches`;
  return path;
}

export function dashboardHref(audience: "public" | "vendor" | "admin") {
  return audience === "vendor" ? routes.app.dashboard : routes.dashboard;
}

export function listingsHref(agency?: AgencyId | "all") {
  if (!agency || agency === "all") return routes.tors;
  return `${routes.tors}?agency=${agency}`;
}
