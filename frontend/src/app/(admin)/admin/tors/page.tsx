import type { Metadata } from "next";

import { TorsView } from "@/components/admin/tors-view";

export const metadata: Metadata = { title: "Records" };

export default function AdminTorsPage() {
  return <TorsView />;
}
