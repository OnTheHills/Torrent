import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { routes } from "@/config/routes";
import { buildContentSecurityPolicy } from "@/lib/csp";
import { readSessionCookie } from "@/lib/session-cookie";

function applySecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  // Allow GIS popups/iframes while isolating the browsing context (ASVS V3.7).
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
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
      const redirect = applySecurityHeaders(
        NextResponse.redirect(new URL(routes.login, request.url)),
        nonce,
      );
      redirect.headers.set("Cache-Control", "no-store");
      return redirect;
    }
    // Presence-only gate. Role checks use verified /auth/me in layouts —
    // never trust an unsigned JWT payload here (ASVS V9.2).
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  if (isAdminRoute || isAppRoute || path.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store");
  }
  return applySecurityHeaders(response, nonce);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
