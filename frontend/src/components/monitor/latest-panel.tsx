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

const frostButton =
  "border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]";

export function LatestPanel() {
  const { t } = useLocale();
  const { data: tors = [] } = useQuery({ queryKey: ["tors"], queryFn: fetchTors });

  const latest = [...tors]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 6);

  return (
    <MonitorSection
      bare
      title={t("latestTors")}
      description={t("latestSubtitle")}
      action={
        <Button asChild className={frostButton}>
          <Link href={routes.tors}>
            {t("viewAllTors")}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Link>
        </Button>
      }
    >
      <ul className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {latest.map((tor) => (
          <li key={tor.id} className="h-full">
            <ListingFrostCard tor={tor} />
          </li>
        ))}
      </ul>
    </MonitorSection>
  );
}
