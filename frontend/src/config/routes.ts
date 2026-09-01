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
  showcase: "/showcase",
  login: "/login",
  register: "/register",
  app: {
    home: "/app",
    tors: "/app/tors",
    tor: (id: string) => `/app/tors/${id}`,
    matches: "/app/matches",
    saved: "/app/saved",
    alerts: "/app/alerts",
    profile: "/app/profile",
  },
  admin: {
    home: "/admin",
  },
} as const;

export function listingHref(id: string, audience: "public" | "vendor" | "admin") {
  return audience === "vendor" ? routes.app.tor(id) : routes.tor(id);
}

export function listingsHref(agency?: AgencyId | "all") {
  if (!agency || agency === "all") return routes.tors;
  return `${routes.tors}?agency=${agency}`;
}
