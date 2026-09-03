"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ChevronFirstIcon,
  ChevronLastIcon,
  Sorting01Icon,
} from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const PAGE_SIZE = 10;
const PAGE_WINDOW_SIZE = 5;
type AnalysisSort = "none" | "desc" | "asc";

export function HistoricalPriceTable({
  benchmarks,
  tors,
}: {
  benchmarks: BudgetBenchmark[];
  tors: Tor[];
}) {
  const { locale, t } = useLocale();
  const [page, setPage] = useState(1);
  const [analysisSort, setAnalysisSort] = useState<AnalysisSort>("none");
  const rows = useMemo(
    () =>
      tors.map((tor, index) => {
        const benchmark = getBenchmarkForCategory(benchmarks, tor.category);
        const median = benchmark?.medianThb ?? tor.budgetThb;
        const ratio = median > 0 ? tor.budgetThb / median : 1;
        const status = getPriceAnalysisStatus(tor.budgetThb, median);

        return {
          index,
          median,
          ratio,
          status,
          tor,
        };
      }),
    [benchmarks, tors]
  );
  const sortedRows = useMemo(() => {
    if (analysisSort === "none") return rows;

    return [...rows].sort((a, b) => {
      const difference =
        analysisSort === "desc" ? b.ratio - a.ratio : a.ratio - b.ratio;
      return difference || a.index - b.index;
    });
  }, [analysisSort, rows]);
  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRows);
  const pageWindowStart =
    Math.floor((currentPage - 1) / PAGE_WINDOW_SIZE) * PAGE_WINDOW_SIZE + 1;
  const pageWindowEnd = Math.min(
    pageWindowStart + PAGE_WINDOW_SIZE - 1,
    totalPages
  );
  const pageNumbers = Array.from(
    { length: pageWindowEnd - pageWindowStart + 1 },
    (_, index) => pageWindowStart + index
  );
  const paginatedRows = useMemo(
    () => sortedRows.slice(startIndex, endIndex),
    [endIndex, sortedRows, startIndex]
  );
  const sortIcon =
    analysisSort === "desc"
      ? ArrowDown01Icon
      : analysisSort === "asc"
        ? ArrowUp01Icon
        : Sorting01Icon;

  function toggleAnalysisSort() {
    setPage(1);
    setAnalysisSort((value) =>
      value === "none" ? "desc" : value === "desc" ? "asc" : "none"
    );
  }

  return (
    <div className="space-y-4">
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
            <TableHead>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-sm text-left transition-colors hover:text-foreground"
                aria-label={t("sortByAnalysis")}
                onClick={toggleAnalysisSort}
              >
                <span>{t("colAnalysis")}</span>
                <HugeiconsIcon
                  icon={sortIcon}
                  strokeWidth={1.75}
                  className="size-3.5"
                />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {totalRows === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                {t("emptyBudgetData")}
              </TableCell>
            </TableRow>
          ) : null}
          {paginatedRows.map(({ median, status, tor }) => {
            const year =
              new Date(tor.publishedAt).getFullYear() +
              (locale === "th" ? 543 : 0);

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

      {totalRows > PAGE_SIZE ? (
        <div className="flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            {startIndex + 1}-{endIndex} {t("of")} {totalRows}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("firstPage")}
              disabled={currentPage === 1}
              onClick={() => setPage(1)}
            >
              <HugeiconsIcon icon={ChevronFirstIcon} strokeWidth={1.75} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("previousPage")}
              disabled={currentPage === 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.75} />
            </Button>
            {pageNumbers.map((pageNumber) => (
              <Button
                key={pageNumber}
                type="button"
                variant={pageNumber === currentPage ? "default" : "outline"}
                size="icon"
                aria-label={`${t("pageLabel")} ${pageNumber}`}
                aria-current={pageNumber === currentPage ? "page" : undefined}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("nextPage")}
              disabled={currentPage === totalPages}
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.75} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("lastPage")}
              disabled={currentPage === totalPages}
              onClick={() => setPage(totalPages)}
            >
              <HugeiconsIcon icon={ChevronLastIcon} strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
