"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { fetchTors } from "@/lib/api";

import { useLocale } from "@/components/providers/locale-provider";
import { AgencyBadge } from "@/components/tor/agency-badge";
import { IntegrityBadge } from "@/components/tor/integrity-badge";
import { LifecycleBadge } from "@/components/tor/lifecycle-badge";
import { FrostCard } from "@/components/ui/frost-card";
import { routes } from "@/config/routes";
import {
  formatBudgetCompact,
  formatDate,
  torAgencyLine,
  torTitle,
} from "@/data/mock";

export function LatestPanel() {
  const { locale, t } = useLocale();
  const { data: tors = [] } = useQuery({ queryKey: ["tors"], queryFn: fetchTors });

  const latest = [...tors]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 6);

  return (
    <FrostCard className="flex h-full flex-col gap-5 rounded-lg p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight md:text-xl">
            {t("latestTors")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("latestSubtitle")}</p>
        </div>
        <Link
          href={routes.tors}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t("viewAllTors")}
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {latest.map((tor) => (
          <li key={tor.id}>
            <Link
              href={routes.tor(tor.id)}
              className="grid gap-3 py-4 transition-colors hover:text-primary sm:grid-cols-[1fr_auto] sm:items-start"
            >
              <div className="min-w-0 space-y-2">
                <p className="font-medium leading-snug">{torTitle(tor, locale)}</p>
                <p className="text-xs text-muted-foreground">
                  {torAgencyLine(tor, locale)} · {tor.refId}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <AgencyBadge agencyId={tor.agencyId} />
                  <LifecycleBadge lifecycle={tor.lifecycle} />
                  <IntegrityBadge status={tor.integrity} />
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-0.5 text-xs sm:items-end">
                <span className="font-medium tabular-nums text-foreground">
                  {formatBudgetCompact(tor.budgetThb, locale)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {t("deadline")} {formatDate(tor.deadline, locale)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </FrostCard>
  );
}
