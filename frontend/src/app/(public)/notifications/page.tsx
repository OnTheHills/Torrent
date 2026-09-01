import { redirect } from "next/navigation";

import { routes } from "@/config/routes";

export default function NotificationsRedirectPage() {
  redirect(routes.login);
}
