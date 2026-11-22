import { cookies } from "next/headers";

import { probeSources } from "@/lib/sources/probe";
import { readSessionCookie, sessionCookieHeader } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

function backendAuthBase() {
  return (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5175/api"
  ).replace(/\/$/, "");
}

/** Admin-only source probe — avoids exposing infrastructure status publicly. */
export async function GET() {
  const jar = await cookies();
  const session = readSessionCookie(jar);
  if (!session) {
    return Response.json({ message: "Not signed in." }, { status: 401 });
  }

  let me: Response;
  try {
    me = await fetch(`${backendAuthBase()}/auth/me`, {
      headers: { cookie: sessionCookieHeader(session.name, session.value) },
      cache: "no-store",
    });
  } catch {
    return Response.json({ message: "Auth service unavailable." }, { status: 503 });
  }

  if (!me.ok) {
    return Response.json({ message: "Not signed in." }, { status: 401 });
  }

  const user = (await me.json()) as { role?: string };
  if (user.role !== "admin") {
    return Response.json({ message: "Forbidden." }, { status: 403 });
  }

  const results = await probeSources();
  const summary = {
    green: results.filter((item) => item.verdict === "green").length,
    yellow: results.filter((item) => item.verdict === "yellow").length,
    red: results.filter((item) => item.verdict === "red").length,
    scrapeRequired: results.some((item) => item.kind === "html"),
    strategy:
      "BMA OCDS JSON, MDES e-GP RSS, public HTML listings for DGA / depa / Labour. Skip login-walled or JS-only e-GP.",
  };

  return Response.json({ probedAt: new Date().toISOString(), summary, results });
}
