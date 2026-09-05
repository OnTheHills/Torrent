import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { TorBrowse } from "@/components/tor/tor-browse";

export const metadata: Metadata = {
  title: "Catalog",
};

export default function VendorTorsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalog"
        title="Software listings"
        description="Public catalog with your match scores. Watch items to follow up."
      />
      <TorBrowse tors={[]} showHeader={false} />
    </div>
  );
}
