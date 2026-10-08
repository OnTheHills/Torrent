"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BankIcon,
  Briefcase01Icon,
  Calendar03Icon,
  CancelCircleIcon,
  Clock01Icon,
  File01Icon,
  GuestHouseIcon,
  SparklesIcon,
  LinkSquare02Icon,
  Money01Icon,
} from "@hugeicons/core-free-icons";

import { MonitorSection } from "@/components/monitor/monitor-section";
import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { ListingStatusBadges } from "@/components/tor/listing-badges";
import { MatchBadge } from "@/components/tor/match-badge";
import { useTorsWithMatches } from "@/components/tor/use-match-scores";
import { SaveTorButton } from "@/components/tor/save-tor-button";
import { SkillTags } from "@/components/tor/skill-tags";
import { Button } from "@/components/ui/button";
import { FrostCard } from "@/components/ui/frost-card";
import { AGENCY_BY_ID, type AgencyId } from "@/config/agencies";
import { listingHref, routes } from "@/config/routes";
import { fitScoreApplies } from "@/lib/listing-stage";
import {
  formatBudgetCompact,
  formatBudgetYear,
  formatDate,
  getPriceAnalysisStatus,
  torAgencyShort,
  torDepartment,
  torTitle,
} from "@/data/mock";
import { buildBudgetBenchmarks, getBenchmarkForCategory } from "@/lib/budget";

const frostButton =
  "border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]";
import { cn } from "@/lib/utils";
import type { Tor } from "@/types/tor";

function FactCard({
  title,
  value,
  valueAside = false,
  valueEnd = false,
  badges,
  icon,
  className,
}: {
  title: string;
  value: string;
  valueAside?: boolean;
  valueEnd?: boolean;
  badges?: string[];
  icon: IconSvgElement;
  className?: string;
}) {
  return (
    <FrostCard
      className={cn(
        "flex h-full flex-col gap-5 rounded-2xl border-0 bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_55%,transparent)] backdrop-blur-xl backdrop-saturate-150 md:p-6",
        className,
      )}
      style={
        {
          "--surface-frost-ring": "transparent",
          "--surface-frost-highlight": "transparent",
        } as CSSProperties
      }
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,white_78%,transparent)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.95)] ring-1 ring-white/80">
          <HugeiconsIcon
            icon={icon}
            strokeWidth={2}
            className="size-5 text-foreground"
          />
        </span>
        <h3 className="min-w-0 flex-1 text-xl font-semibold tracking-tight">
          {title}
        </h3>
        {valueAside ? (
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
        ) : null}
      </div>
      {valueAside ? null : (
        <p
          className={cn(
            "text-3xl font-semibold tracking-tight tabular-nums",
            valueEnd && "mt-auto text-right",
          )}
        >
          {value}
        </p>
      )}
      {badges?.length ? (
        <div className="mt-auto flex flex-wrap items-center justify-end gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge}
              className="inline-flex max-w-full rounded-full bg-white px-2.5 py-1 text-sm font-medium text-foreground"
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </FrostCard>
  );
}

export function TorDetail({
  benchmarkTors,
  tor,
  returnTo,
}: {
  benchmarkTors?: Tor[];
  tor: Tor;
  returnTo?: "matches";
}) {
  const { locale, t } = useLocale();
  const audience = useAudience();
  const vendor = audience === "vendor";
  const [scoredTor] = useTorsWithMatches([tor], vendor);
  const listing = scoredTor ?? tor;
  const catalog = vendor ? routes.app.tors : routes.tors;
  const backHref = returnTo === "matches" ? routes.app.home : catalog;
  const backLabel = returnTo === "matches" ? t("backToMatches") : t("backToListings");
  const benchmarks = buildBudgetBenchmarks(
    benchmarkTors?.length ? benchmarkTors : [tor],
  );
  const benchmark = getBenchmarkForCategory(benchmarks, tor.category);
  const hasBudget = Number.isFinite(tor.budgetThb) && tor.budgetThb > 0;
  const hasDeadline = Boolean(tor.deadline);
  const summary = (
    locale === "th"
      ? tor.summaryTh || tor.summary
      : tor.summary || tor.summaryTh
  ).trim();
  const missingBrief =
    tor.sourceKind === "bma-egp2"
      ? t("detailBriefMissingBma")
      : t("detailBriefMissing");
  const vsMedian =
    hasBudget && benchmark
      ? getPriceAnalysisStatus(tor.budgetThb, benchmark.medianThb)
      : null;
  const vsLabel =
    vsMedian === "above"
      ? t("statusAboveAvg")
      : vsMedian === "below"
        ? t("statusBelowAvg")
        : vsMedian === "near"
          ? t("statusNearAvg")
          : null;
  const budgetBadges = [
    tor.budgetYear
      ? `${t("budgetYear")} ${formatBudgetYear(tor.budgetYear)}`
      : null,
    hasBudget && benchmark
      ? [
          `${t("budgetMedian")} ${formatBudgetCompact(benchmark.medianThb, locale)}`,
          vsLabel,
        ]
          .filter(Boolean)
          .join(" · ")
      : null,
  ].filter((badge): badge is string => Boolean(badge));
  const provenance =
    summary && tor.ocr?.status === "ok"
      ? tor.ocr.model
        ? t("vertexSummaryFromTor")
        : tor.ocr.method === "text"
          ? t("textFromPlanPdf")
          : t("ocrFromPlanPdf")
      : null;
  const sourceLabel = torAgencyShort(tor, locale).trim();
  const department = torDepartment(tor, locale).trim();
  const agencyLogo = AGENCY_BY_ID[tor.agencyId as AgencyId]?.logo;

  const pdfUrl = tor.pdfUrl || tor.ocr?.fileUrl || "";
  const fitScore = !vendor ? null : !fitScoreApplies(listing) ? (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <HugeiconsIcon
        icon={CancelCircleIcon}
        strokeWidth={1.75}
        className="size-4 shrink-0"
      />
      {t("matchUnavailable")}
    </span>
  ) : typeof listing.matchScore === "number" ? (
    <MatchBadge score={listing.matchScore} className="text-lg" />
  ) : listing.matchPending ? (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span
        aria-hidden
        className="size-4 shrink-0 animate-spin rounded-full border-2 border-current/25 border-t-current motion-reduce:animate-none"
      />
      {t("matchPending")}
    </span>
  ) : null;

  const actions = (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        vendor && "justify-end",
      )}
    >
      {fitScore ? <div className="mr-auto">{fitScore}</div> : null}
      {tor.egpUrl ? (
        <Button asChild size="lg" variant={vendor ? "default" : "orange"}>
          <a href={tor.egpUrl} target="_blank" rel="noreferrer">
            {t("openEgp")}
            <HugeiconsIcon icon={LinkSquare02Icon} strokeWidth={2} />
          </a>
        </Button>
      ) : null}
      {pdfUrl ? (
        <Button asChild size="lg" variant="outline">
          <a href={pdfUrl} target="_blank" rel="noreferrer">
            {t("openPlanPdf")}
            <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
          </a>
        </Button>
      ) : null}
      {vendor ? (
        <SaveTorButton
          torId={tor.id}
          appearance="frost-circle"
          showLabel={false}
          className="size-10"
        />
      ) : null}
    </div>
  );

  const facts = (
    <MonitorSection
      title={t("detailFactsTitle")}
      description={t("detailFactsDescription")}
      bare
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-4">
        <FactCard
          title={t("budget")}
          value={formatBudgetCompact(tor.budgetThb, locale)}
          valueAside
          badges={budgetBadges}
          icon={Money01Icon}
        />
        <FactCard
          title={t("publishedAt")}
          value={formatDate(tor.publishedAt, locale)}
          valueEnd
          icon={Calendar03Icon}
        />
        <FactCard
          title={t("closeDate")}
          value={
            hasDeadline ? formatDate(tor.deadline, locale) : t("notSpecified")
          }
          valueEnd
          icon={Clock01Icon}
        />
      </div>
    </MonitorSection>
  );

  const matchInsight =
    vendor &&
    typeof listing.matchScore === "number" &&
    listing.matchInsight?.trim() ? (
      <div className="relative overflow-hidden rounded-2xl">
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
        <FrostCard
          className={cn(
            "relative overflow-hidden rounded-2xl border-0 p-6 md:p-8",
            "bg-[color-mix(in_srgb,white_40%,transparent)]",
            "shadow-none ring-0 backdrop-blur-3xl backdrop-saturate-150",
          )}
          style={
            {
              "--surface-frost-ring": "transparent",
              "--surface-frost-highlight": "transparent",
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.55)",
            } as CSSProperties
          }
        >
          <div className="relative flex flex-wrap items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,white_18%,transparent)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] ring-1 ring-white/35 backdrop-blur-md backdrop-saturate-150">
              <HugeiconsIcon
                icon={SparklesIcon}
                strokeWidth={2}
                className="size-5 text-foreground"
              />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-semibold tracking-tight">
                {t("aiMatchInsight")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("matchInsightForStudio")}
              </p>
            </div>
            <MatchBadge score={listing.matchScore} className="text-lg" />
          </div>
          <p className="relative mt-5 text-base leading-[1.75] text-foreground">
            {listing.matchInsight}
          </p>
        </FrostCard>
      </div>
    ) : null;

  const brief = (
    <MonitorSection title={t("summary")} bare>
      <div className="relative overflow-hidden rounded-2xl">
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
        <FrostCard
          className={cn(
            "relative overflow-hidden rounded-2xl border-0 p-6 md:p-8",
            "bg-[color-mix(in_srgb,white_40%,transparent)]",
            "shadow-none ring-0 backdrop-blur-3xl backdrop-saturate-150",
          )}
          style={
            {
              "--surface-frost-ring": "transparent",
              "--surface-frost-highlight": "transparent",
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.55)",
            } as CSSProperties
          }
        >
          <div className="relative flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,white_18%,transparent)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] ring-1 ring-white/35 backdrop-blur-md backdrop-saturate-150">
              <HugeiconsIcon
                icon={SparklesIcon}
                strokeWidth={2}
                className="size-5 text-foreground"
              />
            </span>
            {provenance ? (
              <h3 className="text-xl font-semibold tracking-tight">
                {provenance}
              </h3>
            ) : null}
          </div>
          <p className="relative mt-5 text-base leading-[1.75] text-foreground">
            {summary || missingBrief}
          </p>
        </FrostCard>
      </div>
    </MonitorSection>
  );

  const requirements = tor.requirements.length ? (
    <MonitorSection title={t("requirements")} bare>
      <FrostCard
        className="space-y-4 rounded-2xl border-0 bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_55%,transparent)] backdrop-blur-xl backdrop-saturate-150 md:p-8"
        style={
          {
            "--surface-frost-ring": "transparent",
            "--surface-frost-highlight": "transparent",
          } as CSSProperties
        }
      >
        <ul className="list-disc space-y-3 pl-5 text-base leading-[1.75] text-foreground">
          {tor.requirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {tor.ocr?.status === "ok" ? (
          <p className="text-sm text-muted-foreground">
            {tor.ocr.method === "text"
              ? t("textFromPlanPdf")
              : t("ocrFromPlanPdf")}
          </p>
        ) : null}
      </FrostCard>
    </MonitorSection>
  ) : null;

  const vendorExtras = vendor ? (
    tor.matchReasons?.length ? (
      <MonitorSection title={t("whyMatch")}>
        <FrostCard className="rounded-lg p-6 md:p-5">
          <ul className="flex flex-wrap gap-2">
            {tor.matchReasons.map((reason) => (
              <li
                key={reason}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {reason}
              </li>
            ))}
          </ul>
        </FrostCard>
      </MonitorSection>
    ) : null
  ) : (
    <MonitorSection
      title={t("vendorGateTitle")}
      description={t("vendorGateBody")}
    >
      <FrostCard className="flex h-full flex-col gap-4 rounded-lg p-6 md:p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--palette-orange-75)]">
            <HugeiconsIcon
              icon={Briefcase01Icon}
              strokeWidth={2}
              className="size-5 text-[var(--palette-orange-700)]"
            />
          </span>
          <h3 className="text-xl font-semibold tracking-tight">
            {t("vendorGateCta")}
          </h3>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <Link href={listingHref(tor.id, "vendor")}>
            {t("vendorGateCta")}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Link>
        </Button>
      </FrostCard>
    </MonitorSection>
  );

  if (vendor) {
    return (
      <div>
        <section className="relative -mt-[144px] overflow-hidden bg-surface text-foreground">
          <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(144px+2rem)] sm:px-6 md:pb-12 md:pt-[calc(144px+3rem)]">
            <Button asChild size="lg" className={frostButton}>
              <Link href={backHref}>
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                {backLabel}
              </Link>
            </Button>
            <div className="mt-10 space-y-5">
              <ListingStatusBadges tor={tor} size="lg" />
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl md:leading-[1.15]">
                {torTitle(tor, locale)}
              </h1>
              {sourceLabel || department ? (
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground">
                  {sourceLabel ? (
                    <span className="inline-flex items-center gap-1.5">
                      {agencyLogo ? (
                        <img
                          src={agencyLogo}
                          alt=""
                          className="size-6 shrink-0 rounded-[4px] object-contain"
                        />
                      ) : (
                        <HugeiconsIcon
                          icon={GuestHouseIcon}
                          strokeWidth={1.75}
                          className="size-3.5 shrink-0"
                        />
                      )}
                      <span>{sourceLabel}</span>
                    </span>
                  ) : null}
                  {department ? (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <HugeiconsIcon
                        icon={BankIcon}
                        strokeWidth={1.75}
                        className="size-3.5 shrink-0"
                      />
                      <span>{department}</span>
                    </span>
                  ) : null}
                </p>
              ) : null}
              {tor.skills.length ? <SkillTags skills={tor.skills} /> : null}
              {actions}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
          {matchInsight}
          {facts}
          {brief}
          {requirements}
          {vendorExtras}
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden hero-atmosphere text-hero-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(144px+2rem)] sm:px-6 md:pb-12 md:pt-[calc(144px+3rem)]">
          <Button asChild size="lg" className={frostButton}>
            <Link href={catalog}>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              {t("backToListings")}
            </Link>
          </Button>
          <div className="mt-8 w-full max-w-5xl">
            <ListingStatusBadges tor={tor} size="lg" className="mb-4" />
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl md:leading-[1.15]">
              {torTitle(tor, locale)}
            </h1>
            {sourceLabel || department ? (
              <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-base leading-[1.7] text-hero-muted md:text-lg">
                {sourceLabel ? (
                  <span className="inline-flex items-center gap-1.5">
                    {agencyLogo ? (
                      <img
                        src={agencyLogo}
                        alt=""
                        className="size-6 shrink-0 rounded-[4px] object-contain"
                      />
                    ) : (
                      <HugeiconsIcon
                        icon={GuestHouseIcon}
                        strokeWidth={1.75}
                        className="size-4 shrink-0"
                      />
                    )}
                    <span>{sourceLabel}</span>
                  </span>
                ) : null}
                {department ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <HugeiconsIcon
                      icon={BankIcon}
                      strokeWidth={1.75}
                      className="size-4 shrink-0"
                    />
                    <span>{department}</span>
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          {tor.skills.length ? (
            <SkillTags skills={tor.skills} className="mt-5 text-hero-muted" />
          ) : null}
          <div className="mt-9 pt-2">{actions}</div>
        </div>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
        {facts}
        {brief}
        {requirements}
        {vendorExtras}
      </div>
    </div>
  );
}
