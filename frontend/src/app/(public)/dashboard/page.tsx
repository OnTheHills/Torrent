import type { Metadata } from "next";

import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = {
  title: "Budget Dashboard",
};

export default function DashboardPage() {
  return <DashboardView />;
}
