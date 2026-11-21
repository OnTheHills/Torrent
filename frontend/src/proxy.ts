import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { routes } from "@/config/routes";
import { buildContentSecurityPolicy } from "@/lib/csp";
import { readSessionCookie } from "@/lib/session-cookie";

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

function applySecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const path = request.nextUrl.pathname;
  const isAdminRoute = path === "/admin" || path.startsWith("/admin/");
  const isAppRoute = path === "/app" || path.startsWith("/app/");

  if (isAdminRoute || isAppRoute) {
    const session = readSessionCookie(request.cookies);
    if (!session) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(routes.login, request.url)),
        nonce,
      );
    }

    const role = roleFromSessionCookie(session.value);
    if (!role) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(routes.login, request.url)),
        nonce,
      );
    }

    // KAN-123: public → no /app or /admin; vendor → all except admin; admin → all.
    if (isAdminRoute && role !== "admin") {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(routes.home, request.url)),
        nonce,
      );
    }
    if (isAppRoute && role !== "vendor" && role !== "admin") {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(routes.home, request.url)),
        nonce,
      );
    }
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  return applySecurityHeaders(response, nonce);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
