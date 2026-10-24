import type { Metadata } from "next";

import { ReviewDetailView } from "@/components/admin/review-detail-view";

export const metadata: Metadata = { title: "Review record" };

export default async function AdminReviewItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReviewDetailView id={id} />;
}
