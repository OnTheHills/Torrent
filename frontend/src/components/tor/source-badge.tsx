"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import type { DataSourceKind } from "@/types/tor";

const SOURCE_KEY = {
  "bma-ocds": "sourceOcds",
  "egp-rss": "sourceRss",
  html: "sourceHtml",
} as const;

export function SourceBadge({ kind }: { kind: DataSourceKind }) {
  const { t } = useLocale();
  return <Badge variant="secondary">{t(SOURCE_KEY[kind])}</Badge>;
}
