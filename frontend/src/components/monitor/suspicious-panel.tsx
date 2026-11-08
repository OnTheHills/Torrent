"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  BankIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";

import { MonitorSection } from "@/components/monitor/monitor-section";
import { useLocale } from "@/components/providers/locale-provider";
import { toggleMany } from "@/components/filters/filter-panel";
import { StageBadge } from "@/components/tor/listing-badges";
import { FilterChecks } from "@/components/tor/tor-filters";
import { liquidGlassDim } from "@/components/ui/appbar";
import {
  FrostPopup,
  FrostPopupContent,
  FrostPopupTrigger,
} from "@/components/ui/frost-popup";
import { Surface } from "@/components/ui/surface";
import { routes } from "@/config/routes";
import {
  formatBudgetCompact,
  formatDate,
  torAgencyLine,
  torTitle,
} from "@/data/mock";
import {
  LISTING_STAGES,
  listingStage,
  type ListingStage,
} from "@/lib/listing-stage";
import { torsQueryOptions } from "@/lib/tors-query";
import { cn } from "@/lib/utils";
import type { DataSourceKind } from "@/types/tor";

const SOURCE_KEY = {
  "bma-ocds": "sourceOcds",
  "bma-egp2": "sourceBmaEgp2",
  "egp-rss": "sourceRss",
  "sme-gp": "sourceSmeGp",
  "data-go": "sourceDataGo",
  html: "sourceHtml",
} as const;

/** liquidGlassDim — clear glass, slightly darker for white panels. */
const frostControl = cn(
  liquidGlassDim,
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium",
  "transition-[transform,background] duration-200 ease-out",
  "hover:-translate-y-0.5",
  "motion-reduce:transition-none motion-reduce:hover:transform-none",
);

const flaggedHref = `${routes.tors}?integrity=suspicious`;

/** Header + eight typical title/meta rows; extra rows scroll inside. */
const TABLE_SCROLL_MAX = "max-h-[calc(2.75rem+8*5.15rem)]";

function sourceLabel(
  kind: DataSourceKind,
  t: (key: (typeof SOURCE_KEY)[DataSourceKind]) => string,
) {
  return t(SOURCE_KEY[kind]);
}

export function SuspiciousPanel() {
  const { locale, t } = useLocale();
  const { data: tors = [], isPending } = useQuery(torsQueryOptions);
  const [stages, setStages] = useState<ListingStage[]>([]);

  const flagged = useMemo(
    () => tors.filter((tor) => tor.integrity === "suspicious"),
    [tors],
  );

  const rows = useMemo(() => {
    if (!stages.length) return flagged;
    return flagged.filter((tor) => stages.includes(listingStage(tor)));
  }, [flagged, stages]);

  const stageItems = LISTING_STAGES.map((stage) => ({
    value: stage,
    label: t(
      (
        {
          open: "stageOpen",
          closing: "stageClosing",
          draft: "stageDraft",
          closed: "stageClosed",
          awarded: "stageWinner",
          cancelled: "stageCancelled",
        } as const
      )[stage],
    ),
  }));

  const showTable = isPending || flagged.length > 0;

  return (
    <MonitorSection
      bare
      title={t("suspiciousTitle")}
      description={t("suspiciousSubtitle")}
      action={
        showTable ? (
          <div className="flex flex-wrap items-center gap-2">
            <FrostPopup>
              <FrostPopupTrigger
                className={cn(
                  frostControl,
                  "outline-none focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)]",
                )}
              >
                {t("lifecycle")}
                {stages.length > 0 ? (
                  <span className="tabular-nums text-muted-foreground">
                    {stages.length}
                  </span>
                ) : null}
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  strokeWidth={2}
                  className="size-3.5 opacity-70"
                />
              </FrostPopupTrigger>
              <FrostPopupContent align="end" className="min-w-48 px-2 py-4">
                <FilterChecks
                  label={t("lifecycle")}
                  items={stageItems}
                  isChecked={(stage) => stages.includes(stage)}
                  onToggle={(stage, checked) =>
                    setStages((prev) => toggleMany(prev, stage, checked))
                  }
                />
              </FrostPopupContent>
            </FrostPopup>

            <Link href={flaggedHref} className={frostControl}>
              {t("viewAllTors")}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                className="size-3.5"
              />
            </Link>
          </div>
        ) : null
      }
    >
      <Surface
        className="overflow-hidden bg-surface p-0 ring-transparent"
        aria-busy={isPending}
      >
        {showTable ? (
          <div className={cn("overflow-auto", TABLE_SCROLL_MAX)}>
            <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col />
                <col className="w-[7rem]" />
                <col className="w-[9.5rem]" />
                <col className="w-[7.5rem]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-surface text-xs text-muted-foreground">
                <tr className="border-b border-[color-mix(in_srgb,var(--palette-gray-300)_35%,transparent)]">
                  <th className="bg-surface px-3 pl-4 py-3 font-medium">
                    {t("project")}
                  </th>
                  <th className="bg-surface py-3 pr-6 pl-3 text-right font-medium">
                    {t("budget")}
                  </th>
                  <th className="bg-surface py-3 pr-1.5 pl-6 font-medium">
                    {t("lifecycle")}
                  </th>
                  <th className="bg-surface py-3 pr-4 pl-3 font-medium">
                    {t("publishedAt")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isPending
                  ? Array.from({ length: 4 }, (_, index) => (
                      <tr
                        key={`skeleton-${index}`}
                        className="border-t border-[color-mix(in_srgb,var(--palette-gray-300)_28%,transparent)]"
                      >
                        <td className="px-3 pl-4 py-3 align-middle">
                          <div className="h-4 w-[88%] animate-pulse rounded bg-[color-mix(in_srgb,var(--palette-gray-300)_35%,transparent)]" />
                          <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[color-mix(in_srgb,var(--palette-gray-300)_28%,transparent)]" />
                        </td>
                        <td className="py-3 pr-6 pl-3 align-middle">
                          <div className="ml-auto h-3.5 w-14 animate-pulse rounded bg-[color-mix(in_srgb,var(--palette-gray-300)_35%,transparent)]" />
                        </td>
                        <td className="py-3 pr-1.5 pl-6 align-middle">
                          <div className="h-6 w-[5.5rem] animate-pulse rounded-full bg-[color-mix(in_srgb,var(--palette-gray-300)_35%,transparent)]" />
                        </td>
                        <td className="py-3 pr-4 pl-3 align-middle">
                          <div className="h-3.5 w-16 animate-pulse rounded bg-[color-mix(in_srgb,var(--palette-gray-300)_35%,transparent)]" />
                        </td>
                      </tr>
                    ))
                  : rows.length > 0
                    ? rows.map((tor) => {
                        const source = sourceLabel(tor.sourceKind, t);
                        const department = torAgencyLine(tor, locale);
                        return (
                          <tr
                            key={tor.id}
                            className="border-t border-[color-mix(in_srgb,var(--palette-gray-300)_28%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,white_45%,transparent)]"
                          >
                            <td className="px-3 pl-4 py-3 align-middle">
                              <Link
                                href={routes.tor(tor.id)}
                                className="line-clamp-2 font-medium leading-snug hover:underline"
                              >
                                {torTitle(tor, locale)}
                              </Link>
                              <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span className="inline-flex min-w-0 items-center gap-1">
                                  <HugeiconsIcon
                                    icon={SourceCodeIcon}
                                    strokeWidth={1.75}
                                    className="size-3.5 shrink-0"
                                  />
                                  <span className="truncate">{source}</span>
                                </span>
                                <span className="inline-flex min-w-0 items-center gap-1">
                                  <HugeiconsIcon
                                    icon={BankIcon}
                                    strokeWidth={1.75}
                                    className="size-3.5 shrink-0"
                                  />
                                  <span className="truncate">{department}</span>
                                </span>
                              </p>
                            </td>
                            <td className="py-3 pr-6 pl-3 align-middle text-right font-medium tabular-nums">
                              {formatBudgetCompact(tor.budgetThb, locale)}
                            </td>
                            <td className="py-3 pr-1.5 pl-6 align-middle">
                              <StageBadge stage={listingStage(tor)} />
                            </td>
                            <td className="py-3 pr-4 pl-3 align-middle tabular-nums text-muted-foreground">
                              {formatDate(tor.publishedAt, locale)}
                            </td>
                          </tr>
                        );
                      })
                    : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          {t("integrityEmptyTitle")}
                        </td>
                      </tr>
                    )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-6 md:p-5">
            <div className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={Alert02Icon}
                strokeWidth={2}
                className="size-5 shrink-0 text-[var(--palette-orange-700)]"
              />
              <h3 className="text-xl font-semibold tracking-tight">
                {t("integrityEmptyTitle")}
              </h3>
            </div>
            <p className="text-sm leading-[1.7] text-muted-foreground">
              {t("integrityEmptyBody")}
            </p>
            <Link href={routes.tors} className={cn(frostControl, "mt-auto w-fit")}>
              {t("browseTors")}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                className="size-3.5"
              />
            </Link>
          </div>
        )}
      </Surface>
    </MonitorSection>
  );
}
