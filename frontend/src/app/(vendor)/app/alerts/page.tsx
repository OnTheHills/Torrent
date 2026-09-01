import type { Metadata } from "next";

import { NotificationSettingsView } from "@/components/notifications/notification-settings-view";

export const metadata: Metadata = {
  title: "Alert rules",
};

export default function VendorAlertsPage() {
  return <NotificationSettingsView />;
}
