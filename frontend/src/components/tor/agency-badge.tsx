"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { agencyShort } from "@/config/agencies";
import type { AgencyId } from "@/types/tor";

export function AgencyBadge({ agencyId }: { agencyId: AgencyId }) {
  const { locale } = useLocale();
  return <Badge variant="outline">{agencyShort(agencyId, locale)}</Badge>;
}
