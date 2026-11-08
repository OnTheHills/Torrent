"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArchiveRestoreIcon,
  CancelCircleIcon,
  GuestHouseIcon,
  MoreVerticalIcon,
  SparklesIcon,
  ThumbsDownIcon,
} from "@hugeicons/core-free-icons";

import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { IntegrityFlagPin } from "@/components/tor/integrity-badge";
import { CategoryBadge, StageBadge } from "@/components/tor/listing-badges";
import { MatchBadge } from "@/components/tor/match-badge";
import { SaveTorButton } from "@/components/tor/save-tor-button";
import { liquidGlassClear, liquidGlassDim } from "@/components/ui/appbar";
import {
  FrostPopup,
  FrostPopupContent,
  FrostPopupItem,
  FrostPopupTrigger,
} from "@/components/ui/frost-popup";
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
  onBadResult,
  dismissed = false,
  returnTo,
  listingsReturn,
}: {
  tor: Tor;
  matchInsight?: string;
  onDismiss?: () => void;
  onBadResult?: () => void;
  dismissed?: boolean;
  returnTo?: "matches";
  /** Current browse URL (with filters) so detail can return here. */
  listingsReturn?: string;
}) {
  const { locale, t } = useLocale();
  const audience = useAudience();
  const vendor = audience === "vendor";
  const organization =
    torDepartment(tor, locale).trim() || torAgencyShort(tor, locale).trim();
  const title = torCardTitle(tor, locale);
  const stage = listingStage(tor);
  const href = listingHref(
    tor.id,
    audience,
    returnTo === "matches"
      ? "matches"
      : listingsReturn
        ? { returnTo: listingsReturn }
        : undefined,
  );

  const flagged = tor.integrity === "suspicious";

  return (
    <div
      className={cn(
        "relative h-full overflow-visible",
        flagged && "z-[1]",
        !vendor &&
          "transition-transform duration-200 ease-out hover:z-10 hover:-translate-y-1 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:transform-none",
      )}
    >
      {/* Always from tor.integrity — not gated by the Watch out filter. */}
      {flagged ? <IntegrityFlagPin /> : null}
      <div
        className={cn(
          liquidGlassClear,
          "relative flex h-full flex-col overflow-hidden rounded-lg text-foreground",
        )}
      >
        <div className="flex min-w-0 flex-col gap-1.5 px-5 pt-5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <StageBadge stage={stage} />
            {tor.category ? <CategoryBadge category={tor.category} /> : null}
          </div>
          {organization ? (
            <p className="flex min-w-0 items-center gap-1.5 pt-1.5 text-xs text-muted-foreground">
              <HugeiconsIcon
                icon={GuestHouseIcon}
                strokeWidth={1.75}
                className="size-3.5 shrink-0"
              />
              <span className="truncate">{organization}</span>
            </p>
          ) : null}
        </div>
        <Link href={href} className="flex min-w-0 flex-1 flex-col">
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
          <div className="relative isolate mx-5 mb-4 mt-2 overflow-hidden rounded-lg">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-lg"
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
              className="pointer-events-none absolute inset-0 rounded-lg bg-[color-mix(in_srgb,var(--palette-black)_14%,transparent)]"
            />
            <div className="relative overflow-hidden rounded-lg bg-[color-mix(in_srgb,white_40%,transparent)] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] backdrop-blur-3xl backdrop-saturate-150">
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
        <div
          className={cn(
            liquidGlassDim,
            "relative mt-auto flex items-end justify-between gap-3 rounded-b-lg px-5 py-4",
            vendor && "pr-14",
          )}
        >
          {vendor ? (
            <div className="absolute right-2.5 top-2.5 z-10">
              <SaveTorButton
                torId={tor.id}
                appearance="frost-circle"
                showLabel={false}
              />
            </div>
          ) : null}
          <div className="flex min-w-0 flex-col items-start gap-2.5">
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
            {onDismiss || onBadResult ? (
              <FrostPopup>
                <FrostPopupTrigger
                  variant="circle"
                  aria-label={t("inboxMatchActions")}
                >
                  <HugeiconsIcon
                    icon={MoreVerticalIcon}
                    strokeWidth={1.75}
                    className="size-4"
                  />
                </FrostPopupTrigger>
                <FrostPopupContent>
                  {onDismiss ? (
                    <FrostPopupItem onSelect={() => onDismiss()}>
                      <HugeiconsIcon
                        icon={dismissed ? ArchiveRestoreIcon : CancelCircleIcon}
                        strokeWidth={1.75}
                        className="size-3.5"
                      />
                      {dismissed ? t("inboxRestore") : t("inboxDismiss")}
                    </FrostPopupItem>
                  ) : null}
                  {onBadResult ? (
                    <FrostPopupItem onSelect={() => onBadResult()}>
                      <HugeiconsIcon
                        icon={ThumbsDownIcon}
                        strokeWidth={1.75}
                        className="size-3.5"
                      />
                      {t("inboxBadResult")}
                    </FrostPopupItem>
                  ) : null}
                </FrostPopupContent>
              </FrostPopup>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
