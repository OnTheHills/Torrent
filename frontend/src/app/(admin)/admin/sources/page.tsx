import type { Metadata } from "next";

import { SourcesView } from "@/components/admin/sources-view";

export const metadata: Metadata = { title: "Sources" };

export default function AdminSourcesPage() {
  return <SourcesView />;
}
