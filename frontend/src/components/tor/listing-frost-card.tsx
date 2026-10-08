"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CancelCircleIcon,
  ExpandIcon,
  GuestHouseIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { CategoryBadge, StageBadge } from "@/components/tor/listing-badges";
import { MatchBadge } from "@/components/tor/match-badge";
import { SaveTorButton } from "@/components/tor/save-tor-button";
import { FrostCard } from "@/components/ui/frost-card";
import { listingHref } from "@/config/routes";
import { fitScoreApplies, listingStage } from "@/lib/listing-stage";
import { cn } from "@/lib/utils";
import {
  formatBudgetCompact,
  formatDate,
  torAgencyShort,
  torCardTitle,
  torDepartment,
} from "@/data/mock";
import type { Tor } from "@/types/tor";

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

export function ListingFrostCard({
  tor,
  matchInsight,
  onDismiss,
  dismissed = false,
  returnTo,
}: {
  tor: Tor;
  matchInsight?: string;
  onDismiss?: () => void;
  dismissed?: boolean;
  returnTo?: "matches";
}) {
  const { locale, t } = useLocale();
  const audience = useAudience();
  const vendor = audience === "vendor";
  const organization =
    torDepartment(tor, locale).trim() || torAgencyShort(tor, locale).trim();
  const title = torCardTitle(tor, locale);
  const stage = listingStage(tor);
  const href = listingHref(tor.id, audience, returnTo);

  return (
    <FrostCard
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--palette-gray-50)_62%,transparent)] p-0 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] backdrop-blur-md backdrop-saturate-150 md:p-0",
        !vendor &&
          "transition-transform duration-200 ease-out hover:z-10 hover:-translate-y-1 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:transform-none",
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5 px-5 pt-5">
        <StageBadge stage={stage} />
        {tor.category ? <CategoryBadge category={tor.category} /> : null}
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
        href={href}
        className="flex min-w-0 flex-1 flex-col"
      >
        {organization ? (
          <p className="flex min-w-0 items-center gap-1.5 px-5 pt-4 text-xs text-muted-foreground">
            <HugeiconsIcon
              icon={GuestHouseIcon}
              strokeWidth={1.75}
              className="size-3.5 shrink-0"
            />
            <span className="truncate">{organization}</span>
          </p>
        ) : null}
        <div className={organization ? "px-5 pb-5 pt-2" : "px-5 pb-5 pt-4"}>
          <h3
            title={title}
            className="line-clamp-3 min-h-[4.125em] text-base font-semibold leading-snug tracking-tight"
          >
            {title}
          </h3>
        </div>
      </Link>
      {matchInsight ? (
        <div className="relative mx-5 mb-4 mt-2 overflow-hidden rounded-lg">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={
              {
                background: [
                  "radial-gradient(ellipse 46% 64% at 6% 28%, var(--palette-orange-300), transparent)",
                  "radial-gradient(ellipse 40% 52% at 30% 6%, var(--palette-yellow-300), transparent)",
                  "radial-gradient(ellipse 44% 58% at 82% 8%, var(--palette-blue-300), transparent)",
                  "radial-gradient(ellipse 46% 64% at 94% 78%, var(--palette-red-200), transparent)",
                  "radial-gradient(ellipse 46% 64% at 8% 92%, var(--palette-teal-300), transparent)",
                ].join(","),
              } as CSSProperties
            }
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--palette-black)_14%,transparent)]"
          />
          <div className="relative bg-[color-mix(in_srgb,white_40%,transparent)] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] backdrop-blur-3xl backdrop-saturate-150">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,white_18%,transparent)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] ring-1 ring-white/35 backdrop-blur-md backdrop-saturate-150">
                <HugeiconsIcon
                  icon={SparklesIcon}
                  strokeWidth={2}
                  className="size-4 text-foreground"
                />
              </span>
              <p className="text-sm font-semibold tracking-tight">
                {t("aiMatchInsight")}
              </p>
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-[1.7] text-foreground">
              {matchInsight}
            </p>
          </div>
        </div>
      ) : null}
      <div className="mt-auto flex items-end justify-between gap-3 bg-[color-mix(in_srgb,var(--palette-gray-200)_72%,transparent)] px-5 py-4 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] backdrop-blur-md">
        <div className="flex min-w-0 flex-col items-start gap-4">
          <p className="text-xl font-medium tabular-nums leading-none tracking-tight">
            {formatBudgetCompact(tor.budgetThb, locale)}
          </p>
          <p className="max-w-full truncate text-xs tabular-nums text-muted-foreground">
            {listingWindow(
              tor.publishedAt,
              tor.deadline,
              locale,
              t("dateNotSpecified"),
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {vendor && !fitScoreApplies(tor) ? (
            <span className="inline-flex items-center gap-1.5 text-right text-xs text-muted-foreground">
              <HugeiconsIcon
                icon={CancelCircleIcon}
                strokeWidth={1.75}
                className="size-3.5 shrink-0"
              />
              {t("matchUnavailable")}
            </span>
          ) : vendor && typeof tor.matchScore === "number" ? (
            <MatchBadge score={tor.matchScore} />
          ) : vendor && tor.matchPending ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                aria-hidden
                className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current/25 border-t-current motion-reduce:animate-none"
              />
              {t("matchPending")}
            </span>
          ) : null}
          <div className="flex items-center gap-2">
            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                className={cn(
                  "inline-flex h-7 items-center justify-center rounded-full border-0 px-3 text-xs font-medium ring-1 backdrop-blur-md backdrop-saturate-150 transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:transform-none",
                  dismissed
                    ? "bg-[color-mix(in_srgb,var(--palette-gray-200)_90%,transparent)] text-[var(--palette-gray-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)]"
                    : "bg-[color-mix(in_srgb,var(--palette-red-400)_32%,transparent)] text-[var(--palette-red-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-[color-mix(in_srgb,var(--palette-red-400)_48%,transparent)] hover:bg-[color-mix(in_srgb,var(--palette-red-400)_44%,transparent)]",
                )}
              >
                {dismissed ? t("inboxRestore") : t("inboxDismiss")}
              </button>
            ) : null}
            <Link
              href={href}
              aria-label={t("viewTor")}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-0 bg-[color-mix(in_srgb,var(--palette-gray-200)_90%,transparent)] text-[var(--palette-gray-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 transition-[transform,background-color,color] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 motion-reduce:transition-none motion-reduce:hover:transform-none"
            >
              <HugeiconsIcon
                icon={ExpandIcon}
                strokeWidth={1.75}
                className="size-4"
              />
            </Link>
          </div>
        </div>
      </div>
    </FrostCard>
  );
}
