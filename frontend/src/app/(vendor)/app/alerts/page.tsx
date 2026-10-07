import type { Metadata } from "next";

import { NotificationSettingsView } from "@/components/notifications/notification-settings-view";

export const metadata: Metadata = {
  title: "Smart Alert",
};

export default function VendorAlertsPage() {
  return <NotificationSettingsView />;
}
