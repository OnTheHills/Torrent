import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import type { SessionUser } from "@/lib/auth";

type SessionRole = SessionUser["role"];

function backendAuthBase() {
  return (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5175/api"
  ).replace(/\/$/, "");
}

/** Server-side gate for audience layouts. Redirects when unsigned or wrong role. */
export async function requireSession(allowed: SessionRole[]) {
  const jar = await cookies();
  const token = jar.get("torrent_session")?.value;
  if (!token) redirect(routes.login);

  let response: Response;
  try {
    response = await fetch(`${backendAuthBase()}/auth/me`, {
      headers: { cookie: `torrent_session=${token}` },
      cache: "no-store",
    });
  } catch {
    redirect(routes.login);
  }

  if (!response.ok) redirect(routes.login);

  const user = (await response.json()) as { role?: SessionRole };
  if (!user.role || !allowed.includes(user.role)) redirect(routes.home);

  return user;
}
