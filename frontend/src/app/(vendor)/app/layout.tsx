import { AppShell } from "@/components/layout/app-shell";
import { AudienceProvider } from "@/components/providers/audience-provider";
import { VENDOR_NAV } from "@/config/navigation";
import { routes } from "@/config/routes";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AudienceProvider audience="vendor">
      <AppShell
        nav={VENDOR_NAV}
        workspace="audienceVendor"
        showBackToSite
        inset
        fullBleedPaths={[
          routes.app.home,
          routes.app.tors,
          routes.app.saved,
          routes.app.profile,
          routes.app.alerts,
        ]}
      >
        {children}
      </AppShell>
    </AudienceProvider>
  );
}
