import type { Metadata } from "next";

import { InboxView } from "@/components/notifications/inbox-view";

export const metadata: Metadata = {
  title: "Inbox",
};

export default function VendorHomePage() {
  return <InboxView />;
}
