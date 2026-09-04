"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { fetchTors } from "@/lib/api";

import { useLocale } from "@/components/providers/locale-provider";
import { AgencyBadge } from "@/components/tor/agency-badge";
import { IntegrityBadge } from "@/components/tor/integrity-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  MOCK_STATS,
  MOCK_SUSPICIOUS_MONTHS,
  torAgencyLine,
  torTitle,
} from "@/data/mock";
import { cn } from "@/lib/utils";

export function SuspiciousPanel() {
  const { locale, t } = useLocale();
  const { data: tors = [] } = useQuery({ queryKey: ["tors"], queryFn: fetchTors });

  const max = Math.max(...MOCK_SUSPICIOUS_MONTHS.map((item) => item.count));
  const flagged = tors.filter((tor) => tor.integrity === "suspicious");

  return (
    <Card className="h-full">
      <CardHeader className="gap-2 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-md bg-warning text-warning-foreground">
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.75} className="size-4" />
          </span>
          <Badge className="border-transparent bg-warning text-warning-foreground">
            {MOCK_STATS.suspiciousTors} {t("flaggedSuffix")}
          </Badge>
        </div>
        <CardTitle className="text-lg md:text-xl">{t("suspiciousTitle")}</CardTitle>
        <CardDescription className="text-sm">
          {t("suspiciousSubtitle")}
        </CardDescription>
        <CardAction>
          <Button size="sm" variant="outline">
            {t("reportAgency")}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {t("monthlyFlags")}
        </p>
        <div className="flex h-28 items-end gap-1.5">
          {MOCK_SUSPICIOUS_MONTHS.map((item, index) => {
            const height = Math.max(12, Math.round((item.count / max) * 100));
            const current = index === MOCK_SUSPICIOUS_MONTHS.length - 1;
            return (
              <div key={item.monthKey} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[0.6rem] tabular-nums text-muted-foreground">
                  {item.count}
                </span>
                <div
                  className={cn(
                    "w-full rounded-t-sm",
                    current ? "bg-warning" : "bg-chart-1/80"
                  )}
                  style={{ height: `${height}%` }}
                  title={`${item.count}`}
                />
                <span className="text-[0.6rem] text-muted-foreground">
                  {locale === "th" ? item.monthTh : item.monthEn}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardContent className="pt-0">
        <ul className="divide-y divide-border border-t border-border">
          {flagged.map((tor) => (
            <li key={tor.id}>
              <Link
                href={routes.tor(tor.id)}
                className="flex flex-col gap-2 py-3.5 transition-colors hover:text-primary"
              >
                <span className="text-sm font-medium leading-snug">
                  {torTitle(tor, locale)}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <AgencyBadge agencyId={tor.agencyId} />
                  <IntegrityBadge status="suspicious" />
                  <span className="text-xs text-muted-foreground">
                    {torAgencyLine(tor, locale)} · {tor.refId}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
