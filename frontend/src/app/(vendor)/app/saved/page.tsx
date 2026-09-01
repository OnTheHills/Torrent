import type { Metadata } from "next";

import { SavedView } from "@/components/notifications/saved-view";

export const metadata: Metadata = {
  title: "Watchlist",
};

export default function VendorSavedPage() {
  return <SavedView />;
}
