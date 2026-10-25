import type { Metadata } from "next";

import { UserDetailView } from "@/components/admin/user-detail-view";

export const metadata: Metadata = { title: "User" };

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserDetailView id={id} />;
}
