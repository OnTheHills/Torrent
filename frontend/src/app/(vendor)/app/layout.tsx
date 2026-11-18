import { AppShell } from "@/components/layout/app-shell";
import { AudienceProvider } from "@/components/providers/audience-provider";
import { VENDOR_NAV } from "@/config/navigation";
import { routes } from "@/config/routes";
import { requireSession } from "@/lib/require-session";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession(["vendor", "admin"]);

  return (
    <AudienceProvider audience="vendor">
      <AppShell
        nav={VENDOR_NAV}
        workspace="audienceVendor"
        inset
        fullBleedPaths={[
          routes.app.home,
          routes.app.landing,
          routes.app.tors,
          routes.app.saved,
          routes.app.profile,
          routes.app.alerts,
          routes.app.matches,
          routes.app.dashboard,
        ]}
      >
        {children}
      </AppShell>
    </AudienceProvider>
  );
}
