import type { Metadata } from "next";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { fetchTors } from "@/lib/api";

export const metadata: Metadata = {
  title: "Budget Dashboard",
};

export default async function DashboardPage() {
  const tors = await fetchTors();
  return <DashboardView tors={tors} />;
}
