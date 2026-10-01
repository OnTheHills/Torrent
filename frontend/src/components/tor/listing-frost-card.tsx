"use client";

import Link from "next/link";

import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { AgencyBadge } from "@/components/tor/agency-badge";
import { IntegrityBadge } from "@/components/tor/integrity-badge";
import { LifecycleBadge } from "@/components/tor/lifecycle-badge";
import { MatchBadge } from "@/components/tor/match-badge";
import { SaveTorButton } from "@/components/tor/save-tor-button";
import { FrostCard, FrostPill } from "@/components/ui/frost-card";
import { listingHref } from "@/config/routes";
import {
  formatBudgetCompact,
  formatBudgetYear,
  formatDate,
  torAgencyLine,
  torTitle,
} from "@/data/mock";
import { cn } from "@/lib/utils";
import type { Tor } from "@/types/tor";

function CardStat({
  label,
  value,
  pills,
  align = "left",
  strong = false,
}: {
  label: string;
  value: string;
  pills?: string[];
  align?: "left" | "right";
  strong?: boolean;
}) {
  return (
    <div className={align === "right" ? "text-right" : undefined}>
      <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={
          strong
            ? "text-sm font-semibold tabular-nums"
            : "text-sm tabular-nums text-muted-foreground"
        }
      >
        {value}
      </p>
      {pills?.length ? (
        <div
          className={cn(
            "mt-1.5 flex flex-wrap gap-1.5",
            align === "right" && "justify-end",
          )}
        >
          {pills.map((pill) => (
            <FrostPill key={pill}>{pill}</FrostPill>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ListingFrostCard({ tor }: { tor: Tor }) {
  const { locale, t } = useLocale();
  const audience = useAudience();
  const vendor = audience === "vendor";

  return (
    <FrostCard className="flex h-full flex-col gap-3 rounded-lg p-5 hover:ring-primary/40 md:p-5">
      <Link href={listingHref(tor.id, audience)} className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-snug tracking-tight">
              {torTitle(tor, locale)}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{tor.refId}</p>
          </div>
          {vendor && typeof tor.matchScore === "number" ? (
            <MatchBadge score={tor.matchScore} className="shrink-0" />
          ) : null}
        </div>
        <p className="text-sm leading-[1.7] text-muted-foreground">
          {torAgencyLine(tor, locale)}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <AgencyBadge agencyId={tor.agencyId} />
          <LifecycleBadge lifecycle={tor.lifecycle} />
          <IntegrityBadge status={tor.integrity} />
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-1">
          <CardStat
            label={t("budget")}
            value={formatBudgetCompact(tor.budgetThb, locale)}
            pills={
              tor.budgetYear
                ? [`${t("budgetYear")} ${formatBudgetYear(tor.budgetYear)}`]
                : undefined
            }
            strong
          />
          <div className="flex flex-wrap items-end justify-end gap-6">
            <CardStat
              label={t("publishedAt")}
              value={formatDate(tor.publishedAt, locale)}
              align="right"
            />
            <CardStat
              label={t("deadline")}
              value={formatDate(tor.deadline, locale)}
              align="right"
            />
          </div>
        </div>
      </Link>
      {vendor ? (
        <div className="flex justify-end">
          <SaveTorButton torId={tor.id} size="sm" variant="outline" />
        </div>
      ) : null}
    </FrostCard>
  );
}
