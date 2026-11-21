import { cookies } from "next/headers";

import { readSessionCookie, sessionCookieHeader } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function backendApiBase() {
  const base =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5175/api";
  return base.replace(/\/+$/, "");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id || !/^[a-f0-9]{24}$/i.test(id)) {
    return Response.json({ message: "Invalid TOR id." }, { status: 400 });
  }
  const session = readSessionCookie(await cookies());
  if (!session) {
    return Response.json({ message: "Not signed in." }, { status: 401 });
  }

  // The backend verifies the admin role, validates the stored document URL,
  // checks DNS and pins the destination. Never fetch remote PDFs directly here.
  let response: Response;
  try {
    response = await fetch(`${backendApiBase()}/admin/tors/${id}/pdf`, {
      headers: { cookie: sessionCookieHeader(session.name, session.value) },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    return Response.json({ message: "Could not reach the PDF service." }, { status: 502 });
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return Response.json(
      { message: typeof body.message === "string" ? body.message : "Could not load TOR PDF." },
      { status: response.status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  if (!response.headers.get("content-type")?.includes("application/pdf")) {
    await response.body?.cancel();
    return Response.json({ message: "PDF service returned an unexpected response." }, { status: 502 });
  }
  return new Response(response.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="tor.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
