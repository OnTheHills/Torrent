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
    landing: "/app/landing",
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
    user: (id: string) => `/admin/users/${id}`,
    matches: "/admin/matches",
    settings: "/admin/settings",
  },
} as const;

export function listingHref(
  id: string,
  audience: "public" | "vendor" | "admin",
  from?: "matches" | { from?: "matches"; returnTo?: string },
) {
  const path = audience === "vendor" ? routes.app.tor(id) : routes.tor(id);
  const options = typeof from === "string" ? { from } : from;
  const params = new URLSearchParams();
  if (options?.from === "matches" && audience === "vendor") {
    params.set("from", "matches");
  }
  if (options?.returnTo) params.set("return", options.returnTo);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Only allow back-nav to the TOR browse routes (keeps filter query intact). */
export function safeListingsReturn(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("://")) return null;
  const path = value.split("?")[0] ?? "";
  if (path !== routes.tors && path !== routes.app.tors) return null;
  return value;
}

export function dashboardHref(audience: "public" | "vendor" | "admin") {
  return audience === "vendor" ? routes.app.dashboard : routes.dashboard;
}

export function listingsHref(_agency?: AgencyId | "all") {
  return routes.tors;
}
