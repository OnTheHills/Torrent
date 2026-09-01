"use client";

import Link from "next/link";

import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { routes } from "@/config/routes";
import {
  formatBudgetCompact,
  getBenchmarkForCategory,
  getPriceAnalysisStatus,
} from "@/data/mock";
import type { Tor } from "@/types/tor";

export function BudgetComparePanel({ tor }: { tor: Tor }) {
  const { locale, t } = useLocale();
  const benchmark = getBenchmarkForCategory(tor.category);

  if (!benchmark) return null;

  const status = getPriceAnalysisStatus(tor.budgetThb, benchmark.medianThb);
  const max = Math.max(tor.budgetThb, benchmark.medianThb) * 1.1;
  const projectPct = Math.round((tor.budgetThb / max) * 100);
  const avgPct = Math.round((benchmark.medianThb / max) * 100);

  const statusLabel =
    status === "above"
      ? t("statusAboveAvg")
      : status === "below"
        ? t("statusBelowAvg")
        : t("statusNearAvg");

  return (
    <Card>
      <CardHeader className="gap-2 border-b border-border pb-5">
        <CardTitle className="text-base md:text-lg">{t("budgetCompareTitle")}</CardTitle>
        <CardDescription>{t("budgetCompareHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{tor.category}</p>
          <Badge
            variant="outline"
            className={
              status === "above"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : status === "below"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-border bg-muted text-muted-foreground"
            }
          >
            {statusLabel}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span>{t("compareLegendProject")}</span>
              <span className="font-medium tabular-nums">
                {formatBudgetCompact(tor.budgetThb, locale)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${projectPct}%` }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span>{t("compareLegendAverage")}</span>
              <span className="font-medium tabular-nums">
                {formatBudgetCompact(benchmark.medianThb, locale)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-muted-foreground/50 transition-all"
                style={{ width: `${avgPct}%` }}
              />
            </div>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={routes.dashboard}>{t("viewPriceAnalysis")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
