import type { Metadata } from "next";

import { MatchesView } from "@/components/admin/matches-view";

export const metadata: Metadata = { title: "Match jobs" };

export default function AdminMatchesPage() {
  return <MatchesView />;
}
