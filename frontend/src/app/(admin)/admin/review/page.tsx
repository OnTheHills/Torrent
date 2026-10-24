import type { Metadata } from "next";

import { ReviewView } from "@/components/admin/review-view";

export const metadata: Metadata = { title: "Review" };

export default function AdminReviewPage() {
  return <ReviewView />;
}
