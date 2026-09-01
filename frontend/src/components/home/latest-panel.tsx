"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { AgencyBadge } from "@/components/tor/agency-badge";
import { IntegrityBadge } from "@/components/tor/integrity-badge";
import { LifecycleBadge } from "@/components/tor/lifecycle-badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { routes } from "@/config/routes";
import {
  formatBudgetCompact,
  formatDate,
  MOCK_TORS,
  torAgencyLine,
  torTitle,
} from "@/data/mock";

export function LatestPanel() {
  const { locale, t } = useLocale();
  const latest = [...MOCK_TORS]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 6);

  return (
    <Card className="h-full">
      <CardHeader className="gap-2 border-b border-border pb-5">
        <CardTitle className="text-lg md:text-xl">{t("latestTors")}</CardTitle>
        <CardDescription className="text-sm">{t("latestSubtitle")}</CardDescription>
        <CardAction>
          <Link
            href={routes.tors}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t("viewAllTors")}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-0">
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
      </CardContent>
    </Card>
  );
}
