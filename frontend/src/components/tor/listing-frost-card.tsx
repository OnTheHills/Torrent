"use client";

import Link from "next/link";

import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { AgencyBadge } from "@/components/tor/agency-badge";
import { IntegrityBadge } from "@/components/tor/integrity-badge";
import { LifecycleBadge } from "@/components/tor/lifecycle-badge";
import { MatchBadge } from "@/components/tor/match-badge";
import { SaveTorButton } from "@/components/tor/save-tor-button";
import { FrostCard } from "@/components/ui/frost-card";
import { listingHref } from "@/config/routes";
import {
  formatBudgetCompact,
  formatDate,
  torAgencyLine,
  torTitle,
} from "@/data/mock";
import type { Tor } from "@/types/tor";

export function ListingFrostCard({
  tor,
  dateField = "deadline",
}: {
  tor: Tor;
  dateField?: "deadline" | "publishedAt";
}) {
  const { locale, t } = useLocale();
  const audience = useAudience();
  const vendor = audience === "vendor";
  const dateIso = dateField === "publishedAt" ? tor.publishedAt : tor.deadline;

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
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              {t("budget")}
            </p>
            <p className="text-sm font-semibold tabular-nums">
              {formatBudgetCompact(tor.budgetThb, locale)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              {dateField === "publishedAt" ? t("publishedAt") : t("deadline")}
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatDate(dateIso, locale)}
            </p>
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
