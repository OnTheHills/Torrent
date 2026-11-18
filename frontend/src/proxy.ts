import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { routes } from "@/config/routes";

type SessionRole = "public" | "vendor" | "admin";

/** Routing hint only — layouts still verify the session via /auth/me. */
function roleFromSessionCookie(token: string): SessionRole | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const json = Buffer.from(segment, "base64url").toString("utf8");
    const payload = JSON.parse(json) as { role?: unknown };
    if (payload.role === "public" || payload.role === "vendor" || payload.role === "admin") {
      return payload.role;
    }
    return null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get("torrent_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL(routes.login, request.url));
  }

  const role = roleFromSessionCookie(token);
  if (!role) {
    return NextResponse.redirect(new URL(routes.login, request.url));
  }

  const path = request.nextUrl.pathname;
  const isAdminRoute = path === "/admin" || path.startsWith("/admin/");
  const isAppRoute = path === "/app" || path.startsWith("/app/");

  // KAN-123: public → no /app or /admin; vendor → all except admin; admin → all.
  if (isAdminRoute && role !== "admin") {
    return NextResponse.redirect(new URL(routes.home, request.url));
  }
  if (isAppRoute && role !== "vendor" && role !== "admin") {
    return NextResponse.redirect(new URL(routes.home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app", "/app/:path*", "/admin", "/admin/:path*"],
};
