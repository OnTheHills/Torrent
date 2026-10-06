import { redirect } from "next/navigation";

import { routes } from "@/config/routes";

export default function MatchesPage() {
  redirect(routes.app.home);
}
