import type { Metadata } from "next";

import { UsersView } from "@/components/admin/users-view";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return <UsersView />;
}
