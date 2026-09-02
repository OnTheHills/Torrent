import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { TorBrowse } from "@/components/tor/tor-browse";
import { fetchTors } from "@/lib/api";

export const metadata: Metadata = {
  title: "Catalog",
};

export default async function VendorTorsPage() {
  const tors = await fetchTors();
  
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalog"
        title="Software listings"
        description="Public catalog with your match scores. Watch items to follow up."
      />
      <TorBrowse tors={tors} showHeader={false} />
    </div>
  );
}
