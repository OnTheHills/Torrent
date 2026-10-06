"use client";

import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  AlarmClockIcon,
  ArrowExpandIcon,
  Award01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  FileEditIcon,
  SquareLock02Icon,
  ExpandIcon,
} from "@hugeicons/core-free-icons";

import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { MatchBadge } from "@/components/tor/match-badge";
import { SaveTorButton } from "@/components/tor/save-tor-button";
import { Badge } from "@/components/ui/badge";
import { FrostCard, FrostPill } from "@/components/ui/frost-card";
import { listingHref } from "@/config/routes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { listingStage, type ListingStage } from "@/lib/listing-stage";
import { cn } from "@/lib/utils";
import {
  formatBudgetCompact,
  formatBudgetYear,
  formatDate,
  torAgencyShort,
  torCardTitle,
  torDepartment,
} from "@/data/mock";
import type { Tor } from "@/types/tor";

const STAGE_BADGE: Record<
  ListingStage,
  { label: DictionaryKey; icon: IconSvgElement; className: string }
> = {
  open: {
    label: "cardStageOpen",
    icon: CheckmarkCircle02Icon,
    className: "text-[var(--palette-green-800)]",
  },
  closing: {
    label: "cardStageClosing",
    icon: AlarmClockIcon,
    className: "text-[var(--palette-yellow-800)]",
  },
  draft: {
    label: "cardStageDraft",
    icon: FileEditIcon,
    className: "text-[var(--palette-gray-700)]",
  },
  closed: {
    label: "cardStageClosed",
    icon: SquareLock02Icon,
    className: "text-[var(--palette-red-700)]",
  },
  awarded: {
    label: "cardStageAwarded",
    icon: Award01Icon,
    className: "text-[var(--palette-red-700)]",
  },
  cancelled: {
    label: "cardStageCancelled",
    icon: CancelCircleIcon,
    className: "text-[var(--palette-red-700)]",
  },
};

function StageBadge({ stage }: { stage: ListingStage }) {
  const { t } = useLocale();
  const badge = STAGE_BADGE[stage];

  return (
    <Badge
      className={cn(
        "h-7 gap-1 px-2.5 py-0 text-xs shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-1 ring-[color-mix(in_srgb,currentColor_32%,transparent)] [&>svg]:size-4!",
        badge.className,
      )}
    >
      <HugeiconsIcon icon={badge.icon} strokeWidth={2} />
      {t(badge.label)}
    </Badge>
  );
}

function listingWindow(
  publishedAt: string,
  deadline: string,
  locale: "en" | "th",
  unspecified: string,
) {
  const start = publishedAt ? formatDate(publishedAt, locale) : "";
  const end = deadline ? formatDate(deadline, locale) : "";
  const known = (value: string) => value && value !== "-";
  if (known(start) && known(end)) return `${start} – ${end}`;
  if (known(start)) return `${start} – ${unspecified}`;
  if (known(end)) return `– ${end}`;
  return "—";
}

export function ListingFrostCard({ tor }: { tor: Tor }) {
  const { locale, t } = useLocale();
  const audience = useAudience();
  const vendor = audience === "vendor";
  const organization = (
    torDepartment(tor, locale).trim() || torAgencyShort(tor, locale).trim()
  );
  const title = torCardTitle(tor, locale);
  const stage = listingStage(tor);

  return (
    <FrostCard
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--palette-gray-50)_62%,transparent)] p-0 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] backdrop-blur-md backdrop-saturate-150 md:p-0",
        !vendor &&
          "transition-transform duration-200 ease-out hover:z-10 hover:-translate-y-1 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:transform-none",
      )}
    >
      <div className="flex items-center gap-3 px-5 pt-5">
        <StageBadge stage={stage} />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {vendor ? (
            <SaveTorButton
              torId={tor.id}
              appearance="frost-circle"
              showLabel={false}
            />
          ) : null}
        </div>
      </div>
      <Link
        href={listingHref(tor.id, audience)}
        className="flex min-w-0 flex-1 flex-col"
      >
        <div className="flex flex-col gap-3 px-5 pt-3 pb-5">
          <h3
            title={title}
            className="line-clamp-3 min-h-[4.125em] text-base font-semibold leading-snug tracking-tight"
          >
            {title}
          </h3>
          <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
            {organization ? (
              <FrostPill className="min-w-0 shrink truncate">
                {organization}
              </FrostPill>
            ) : null}
            {tor.budgetYear ? (
              <FrostPill className="shrink-0">
                {t("budgetYear")} {formatBudgetYear(tor.budgetYear)}
              </FrostPill>
            ) : null}
          </div>
        </div>
      </Link>
      <div className="mt-auto flex items-end justify-between gap-3 bg-[color-mix(in_srgb,var(--palette-gray-200)_72%,transparent)] px-5 py-4 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] backdrop-blur-md">
        <div className="flex min-w-0 flex-col items-start gap-2">
          <p className="text-2xl font-medium tabular-nums leading-none tracking-tight">
            {formatBudgetCompact(tor.budgetThb, locale)}
          </p>
          <p className="max-w-full truncate text-xs tabular-nums text-muted-foreground">
            {listingWindow(tor.publishedAt, tor.deadline, locale, t("dateNotSpecified"))}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {vendor && typeof tor.matchScore === "number" ? (
            <MatchBadge score={tor.matchScore} />
          ) : null}
          <Link
            href={listingHref(tor.id, audience)}
            aria-label={t("viewTor")}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-0 bg-[color-mix(in_srgb,var(--palette-gray-200)_90%,transparent)] text-[var(--palette-gray-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 transition-[transform,background-color,color] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 motion-reduce:transition-none motion-reduce:hover:transform-none"
          >
            <HugeiconsIcon icon={ExpandIcon} strokeWidth={1.75} className="size-4" />
          </Link>
        </div>
      </div>
    </FrostCard>
  );
}
