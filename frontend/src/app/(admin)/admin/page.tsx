import type { Metadata } from "next";

import { OverviewView } from "@/components/admin/overview-view";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return <OverviewView />;
}
