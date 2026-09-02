"use client";

import Link from "next/link";

import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routes } from "@/config/routes";
import {
  formatBudgetCompact,
  getPriceAnalysisStatus,
  torAgencyShort,
  torTitle,
} from "@/data/mock";
import { getBenchmarkForCategory } from "@/lib/budget";
import type { BudgetBenchmark, Tor } from "@/types/tor";

export function HistoricalPriceTable({
  benchmarks,
  tors,
}: {
  benchmarks: BudgetBenchmark[];
  tors: Tor[];
}) {
  const { locale, t } = useLocale();

  return (
    <Table className="min-w-[56rem] table-fixed">
      <colgroup>
        <col className="w-[28%]" />
        <col className="w-[16%]" />
        <col className="w-[16%]" />
        <col className="w-[8%]" />
        <col className="w-[11%]" />
        <col className="w-[11%]" />
        <col className="w-[10%]" />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead>{t("colProject")}</TableHead>
          <TableHead className="whitespace-normal">{t("colAgency")}</TableHead>
          <TableHead className="whitespace-normal">{t("colCategory")}</TableHead>
          <TableHead>{t("colFiscalYear")}</TableHead>
          <TableHead className="text-right">{t("colBudget")}</TableHead>
          <TableHead className="text-right">{t("colAverage")}</TableHead>
          <TableHead>{t("colAnalysis")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tors.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={7}
              className="h-24 text-center text-sm text-muted-foreground"
            >
              {t("emptyBudgetData")}
            </TableCell>
          </TableRow>
        ) : null}
        {tors.map((tor) => {
          const benchmark = getBenchmarkForCategory(benchmarks, tor.category);
          const median = benchmark?.medianThb ?? tor.budgetThb;
          const status = getPriceAnalysisStatus(tor.budgetThb, median);
          const year = new Date(tor.publishedAt).getFullYear() + (locale === "th" ? 543 : 0);

          const statusLabel =
            status === "above"
              ? t("statusAboveAvg")
              : status === "below"
                ? t("statusBelowAvg")
                : t("statusNearAvg");

          return (
            <TableRow key={tor.id}>
              <TableCell className="whitespace-normal break-words align-top">
                <Link
                  href={routes.tor(tor.id)}
                  className="font-medium leading-snug hover:text-primary"
                >
                  {torTitle(tor, locale)}
                </Link>
              </TableCell>
              <TableCell className="whitespace-normal break-words align-top leading-snug">
                {torAgencyShort(tor, locale)}
              </TableCell>
              <TableCell className="whitespace-normal align-top">
                <Badge
                  variant="outline"
                  className="h-auto min-h-5 max-w-full justify-start whitespace-normal break-words text-left leading-snug [overflow-wrap:anywhere]"
                >
                  {tor.category}
                </Badge>
              </TableCell>
              <TableCell className="align-top tabular-nums">{year}</TableCell>
              <TableCell className="align-top text-right tabular-nums">
                {formatBudgetCompact(tor.budgetThb, locale)}
              </TableCell>
              <TableCell className="align-top text-right tabular-nums text-muted-foreground">
                {formatBudgetCompact(median, locale)}
              </TableCell>
              <TableCell className="whitespace-normal align-top">
                <Badge
                  variant="outline"
                  className={
                    status === "above"
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : status === "below"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : undefined
                  }
                >
                  {statusLabel}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
