"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { fetchTors } from "@/lib/api";

import { MonitorSection } from "@/components/monitor/monitor-section";
import { useLocale } from "@/components/providers/locale-provider";
import { ListingFrostCard } from "@/components/tor/listing-frost-card";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export function LatestPanel() {
  const { t } = useLocale();
  const { data: tors = [] } = useQuery({ queryKey: ["tors"], queryFn: fetchTors });

  const latest = [...tors]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 5);

  return (
    <MonitorSection
      title={t("latestTors")}
      description={t("latestSubtitle")}
      action={
        <Button asChild variant="orange">
          <Link href={routes.tors}>
            {t("viewAllTors")}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Link>
        </Button>
      }
    >
      <ul className="grid gap-4">
        {latest.map((tor) => (
          <li key={tor.id}>
            <ListingFrostCard tor={tor} />
          </li>
        ))}
      </ul>
    </MonitorSection>
  );
}
