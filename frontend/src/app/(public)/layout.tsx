import { AppShell } from "@/components/layout/app-shell";
import { AudienceProvider } from "@/components/providers/audience-provider";
import { PUBLIC_NAV } from "@/config/navigation";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AudienceProvider audience="public">
      <AppShell nav={PUBLIC_NAV} workspace="audiencePublic">
        {children}
      </AppShell>
    </AudienceProvider>
  );
}
