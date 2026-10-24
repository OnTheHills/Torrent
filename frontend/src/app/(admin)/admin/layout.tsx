import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { AudienceProvider } from "@/components/providers/audience-provider";
import { ADMIN_NAV } from "@/config/navigation";
import { routes } from "@/config/routes";

async function requireAdmin() {
  const jar = await cookies();
  const token = jar.get("torrent_session")?.value;
  if (!token) redirect(routes.login);

  const base = (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5175/api"
  ).replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/auth/me`, {
      headers: { cookie: `torrent_session=${token}` },
      cache: "no-store",
    });
  } catch {
    redirect(routes.login);
  }
  if (!response.ok) redirect(routes.login);
  const user = (await response.json()) as { role?: string };
  if (user.role !== "admin") redirect(routes.home);
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <AudienceProvider audience="admin">
      <AppShell nav={ADMIN_NAV} workspace="audienceAdmin" showBackToSite>
        {children}
      </AppShell>
    </AudienceProvider>
  );
}
