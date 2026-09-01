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
  getBenchmarkForCategory,
  getPriceAnalysisStatus,
  torAgencyShort,
  torTitle,
} from "@/data/mock";
import type { Tor } from "@/types/tor";

export function HistoricalPriceTable({ tors }: { tors: Tor[] }) {
  const { locale, t } = useLocale();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("colProject")}</TableHead>
          <TableHead>{t("colAgency")}</TableHead>
          <TableHead>{t("colCategory")}</TableHead>
          <TableHead>{t("colFiscalYear")}</TableHead>
          <TableHead className="text-right">{t("colBudget")}</TableHead>
          <TableHead className="text-right">{t("colAverage")}</TableHead>
          <TableHead>{t("colAnalysis")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tors.map((tor) => {
          const benchmark = getBenchmarkForCategory(tor.category);
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
              <TableCell className="max-w-[16rem]">
                <Link
                  href={routes.tor(tor.id)}
                  className="font-medium hover:text-primary"
                >
                  {torTitle(tor, locale)}
                </Link>
              </TableCell>
              <TableCell>{torAgencyShort(tor, locale)}</TableCell>
              <TableCell>
                <Badge variant="outline">{tor.category}</Badge>
              </TableCell>
              <TableCell className="tabular-nums">{year}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBudgetCompact(tor.budgetThb, locale)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatBudgetCompact(median, locale)}
              </TableCell>
              <TableCell>
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
