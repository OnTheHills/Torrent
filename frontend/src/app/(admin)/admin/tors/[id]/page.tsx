import type { Metadata } from "next";
import { Suspense } from "react";

import { ReviewDetailView } from "@/components/admin/review-detail-view";

export const metadata: Metadata = { title: "Edit record" };

export default async function AdminTorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Loading…</p>}>
      <ReviewDetailView id={id} />
    </Suspense>
  );
}
