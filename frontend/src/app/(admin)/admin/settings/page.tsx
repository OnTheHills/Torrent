import type { Metadata } from "next";

import { SettingsView } from "@/components/admin/settings-view";

export const metadata: Metadata = { title: "Classification rules" };

export default function AdminSettingsPage() {
  return <SettingsView />;
}