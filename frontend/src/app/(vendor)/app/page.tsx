import type { Metadata } from "next";

import { InboxView } from "@/components/notifications/inbox-view";

export const metadata: Metadata = {
  title: "AI Matches",
};

export default function VendorHomePage() {
  return <InboxView />;
}
