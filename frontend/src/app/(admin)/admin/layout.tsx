import { AppShell } from "@/components/layout/app-shell";
import { AudienceProvider } from "@/components/providers/audience-provider";
import { ADMIN_NAV } from "@/config/navigation";
import { requireSession } from "@/lib/require-session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession(["admin"]);

  return (
    <AudienceProvider audience="admin">
      <AppShell nav={ADMIN_NAV} workspace="audienceAdmin">
        {children}
      </AppShell>
    </AudienceProvider>
  );
}
