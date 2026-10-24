import type { Metadata } from "next";

import { TorEditView } from "@/components/admin/tor-edit-view";

export const metadata: Metadata = { title: "Edit record" };

export default async function AdminTorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TorEditView id={id} />;
}
