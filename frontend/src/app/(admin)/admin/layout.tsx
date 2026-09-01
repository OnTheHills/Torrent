import { AppShell } from "@/components/layout/app-shell";
import { AudienceProvider } from "@/components/providers/audience-provider";
import { ADMIN_NAV } from "@/config/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AudienceProvider audience="admin">
      <AppShell nav={ADMIN_NAV} workspace="audienceAdmin" showBackToSite inset>
        {children}
      </AppShell>
    </AudienceProvider>
  );
}
