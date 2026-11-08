"use client";

import { ShellContent } from "@/components/layout/shell-content";
import type { CSSProperties } from "react";
import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BankIcon,
  DatabaseIcon,
  Briefcase01Icon,
  Calendar03Icon,
  CancelCircleIcon,
  Clock01Icon,
  File01Icon,
  HeartIcon,
  Message01Icon,
  Notification03Icon,
  SparklesIcon,
  LinkSquare02Icon,
  Money01Icon,
} from "@hugeicons/core-free-icons";

import { WatchOutCard } from "@/components/admin/watch-out-card";
import { MonitorSection } from "@/components/monitor/monitor-section";
import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { IntegrityBadge } from "@/components/tor/integrity-badge";
import {
  categoryBlueprint,
  ListingStatusBadges,
} from "@/components/tor/listing-badges";
import { MatchBadge } from "@/components/tor/match-badge";
import { useTorsWithMatches } from "@/components/tor/use-match-scores";
import { SaveTorButton } from "@/components/tor/save-tor-button";
import { SkillTags } from "@/components/tor/skill-tags";
import { chromeFrostGlaze, liquidGlassDim } from "@/components/ui/appbar";
import { FrostCard } from "@/components/ui/frost-card";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { AGENCY_BY_ID, type AgencyId } from "@/config/agencies";
import { listingHref, routes, safeListingsReturn } from "@/config/routes";
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
import {
  buildBudgetBenchmarks,
  getBenchmarkForCategory,
  type BudgetPeer,
} from "@/lib/budget";

import { stripLeadingListMarker } from "@/lib/requirement-text";
import { cn } from "@/lib/utils";
import type { Tor } from "@/types/tor";

/** Same liquid-glass pill as Open TOR PDF (dim frost over chroma). */
const glassLink = cn(
  liquidGlassDim,
  "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium",
  "transition-[transform,background] duration-200 ease-out hover:-translate-y-0.5",
  "motion-reduce:transition-none motion-reduce:hover:transform-none",
);

/** Soft hero → canvas wash (same recipe as landing). */
/** Short bottom wash only — keep paper/grid visible behind badges + CTAs. */
const heroFade =
  "pointer-events-none absolute inset-x-0 bottom-0 z-[1] !absolute h-24 bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--background)_35%,transparent)_55%,var(--background)_100%)]";

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
  listingsReturn,
}: {
  benchmarkTors?: BudgetPeer[];
  tor: Tor;
  returnTo?: "matches";
  /** Browse URL with filter query — keeps filters when going back. */
  listingsReturn?: string;
}) {
  const { locale, t } = useLocale();
  const audience = useAudience();
  const vendor = audience === "vendor";
  const [scoredTor] = useTorsWithMatches([tor], vendor);
  const listing = scoredTor ?? tor;
  const catalog = vendor ? routes.app.tors : routes.tors;
  const backHref =
    returnTo === "matches"
      ? routes.app.home
      : (safeListingsReturn(listingsReturn) ?? catalog);
  const backLabel =
    returnTo === "matches" ? t("backToMatches") : t("backToListings");
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
  const flagged = tor.integrity === "suspicious";
  const watchOut = flagged ? (
    <WatchOutCard
      data={{
        integrityStatus: "flagged",
        integrityFlags: tor.integrityFlags,
        integrityReason: tor.integrityReason,
        integrityNote: tor.integrityNote,
        integrityNoteEn: tor.integrityNoteEn,
      }}
    />
  ) : null;

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

  const statusBadges = (
    <div className="flex flex-wrap items-center gap-1.5">
      <ListingStatusBadges tor={tor} size="lg" />
      {flagged ? <IntegrityBadge status="suspicious" size="lg" /> : null}
    </div>
  );

  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="mr-auto flex flex-wrap items-center gap-3">
        {statusBadges}
        {fitScore}
      </div>
      {tor.egpUrl ? (
        <a
          href={tor.egpUrl}
          target="_blank"
          rel="noreferrer"
          className={glassLink}
        >
          {t("openEgp")}
          <HugeiconsIcon
            icon={LinkSquare02Icon}
            strokeWidth={2}
            className="size-4"
          />
        </a>
      ) : null}
      {pdfUrl ? (
        <a href={pdfUrl} target="_blank" rel="noreferrer" className={glassLink}>
          {t("openPlanPdf")}
          <HugeiconsIcon icon={File01Icon} strokeWidth={2} className="size-4" />
        </a>
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
      <div className="space-y-3 sm:space-y-4">
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
        {watchOut}
      </div>
    </MonitorSection>
  );

  const rainbowScene = {
    background: [
      "radial-gradient(ellipse 46% 64% at 6% 28%, color-mix(in srgb, var(--palette-orange-300) 58%, transparent), transparent)",
      "radial-gradient(ellipse 40% 52% at 30% 6%, color-mix(in srgb, var(--palette-yellow-300) 58%, transparent), transparent)",
      "radial-gradient(ellipse 44% 58% at 82% 8%, color-mix(in srgb, var(--palette-blue-300) 58%, transparent), transparent)",
      "radial-gradient(ellipse 46% 64% at 94% 78%, color-mix(in srgb, var(--palette-red-200) 58%, transparent), transparent)",
      "radial-gradient(ellipse 46% 64% at 8% 92%, color-mix(in srgb, var(--palette-teal-300) 58%, transparent), transparent)",
    ].join(","),
  } as CSSProperties;

  const matchInsight =
    vendor &&
    typeof listing.matchScore === "number" &&
    listing.matchInsight?.trim() ? (
      <div className="relative overflow-hidden rounded-2xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={rainbowScene}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--palette-black)_22%,transparent)]"
        />
        <div className="liquid-glass-card liquid-glass-card-static relative rounded-2xl p-6 md:p-8">
          <div className="relative flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="liquid-glass-ink flex items-center gap-2 text-xl font-semibold tracking-tight">
                <HugeiconsIcon
                  icon={SparklesIcon}
                  strokeWidth={2}
                  className="size-5 shrink-0"
                />
                {t("aiMatchInsight")}
              </h3>
              <p className="liquid-glass-muted mt-1 text-sm">
                {t("matchInsightForStudio")}
              </p>
            </div>
            <MatchBadge score={listing.matchScore} className="text-lg" />
          </div>
          <p className="liquid-glass-ink relative mt-5 text-base leading-[1.75]">
            {listing.matchInsight}
          </p>
        </div>
      </div>
    ) : null;

  const brief = (
    <MonitorSection title={t("summary")} bare>
      <div className="relative overflow-hidden rounded-2xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={rainbowScene}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--palette-black)_22%,transparent)]"
        />
        <div className="liquid-glass-card liquid-glass-card-static relative rounded-2xl p-5 md:p-6">
          <div className="relative flex items-center gap-2">
            <HugeiconsIcon
              icon={SparklesIcon}
              strokeWidth={2}
              className="size-5 shrink-0 text-[color:var(--liquid-glass-ink)]"
            />
            <h3 className="liquid-glass-ink text-xl font-semibold tracking-tight">
              {provenance || t("summary")}
            </h3>
          </div>
          <p className="liquid-glass-ink relative mt-4 text-base leading-[1.75]">
            {summary || missingBrief}
          </p>
        </div>
      </div>
    </MonitorSection>
  );

  const requirementCategoryOrder = [
    "technical",
    "delivery",
    "compliance",
    "team",
    "other",
  ] as const;
  const requirementCategoryLabel = {
    technical: "reqCategoryTechnical",
    delivery: "reqCategoryDelivery",
    compliance: "reqCategoryCompliance",
    team: "reqCategoryTeam",
    other: "reqCategoryOther",
  } as const;
  const requirementFrost = {
    "--surface-frost-ring": "transparent",
    "--surface-frost-highlight": "transparent",
  } as CSSProperties;
  const requirementCardClass =
    "space-y-4 rounded-2xl border-0 bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_55%,transparent)] backdrop-blur-xl backdrop-saturate-150 md:p-8";

  const structuredRequirements = (
    tor.requirementItems?.length
      ? tor.requirementItems
      : tor.requirements.map((text, index) => ({
          category: "other" as const,
          text,
          textEn: tor.requirementsEn?.[index],
        }))
  ).map((item) => ({
    ...item,
    display: stripLeadingListMarker(
      locale === "en" ? item.textEn?.trim() || item.text : item.text,
    ),
  }));

  const requirementGroups = requirementCategoryOrder
    .map((category) => ({
      category,
      items: structuredRequirements.filter(
        (item) => (item.category || "other") === category && item.display,
      ),
    }))
    .filter((group) => group.items.length);

  const requirements = requirementGroups.length ? (
    <MonitorSection
      title={t("requirements")}
      description={t("detailRequirementsDescription")}
      bare
    >
      <div className="grid gap-3 sm:gap-4">
        {requirementGroups.map((group) => (
          <FrostCard
            key={group.category}
            className={requirementCardClass}
            style={requirementFrost}
          >
            <h3 className="text-lg font-semibold tracking-tight">
              {t(requirementCategoryLabel[group.category])}
            </h3>
            <ul className="list-disc space-y-3 pl-5 text-base leading-[1.75] text-foreground">
              {group.items.map((item) => (
                <li key={`${group.category}-${item.display}`}>
                  {item.display}
                </li>
              ))}
            </ul>
          </FrostCard>
        ))}
      </div>
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
      bare
    >
      <div className="relative overflow-hidden rounded-2xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(130%_120%_at_0%_0%,var(--palette-orange-200),var(--palette-orange-300)_78%,var(--palette-orange-400))]"
        />
        <div className="liquid-glass-card liquid-glass-card-static relative rounded-2xl p-5 md:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            <div className="min-w-0 max-w-xl flex-1 space-y-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.95)] ring-1 ring-white/80">
                  <HugeiconsIcon
                    icon={Briefcase01Icon}
                    strokeWidth={2}
                    className="size-5 text-foreground"
                  />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="liquid-glass-muted text-sm leading-snug">
                    {t("roleVendorEyebrow")}
                  </p>
                  <h3 className="liquid-glass-ink text-xl font-semibold tracking-tight">
                    {t("roleVendorTitle")}
                  </h3>
                </div>
              </div>

              <ul className="space-y-3">
                {(
                  [
                    {
                      name: "navInbox",
                      label: "roleVendorFeature1",
                      icon: SparklesIcon,
                    },
                    {
                      name: "navWatchlist",
                      label: "roleVendorFeature2",
                      icon: HeartIcon,
                    },
                    {
                      name: "navAlerts",
                      label: "roleVendorFeature3",
                      icon: Notification03Icon,
                    },
                    {
                      name: "roleVendorLineTitle",
                      label: "roleVendorFeature4",
                      icon: Message01Icon,
                    },
                  ] as const satisfies ReadonlyArray<{
                    name: DictionaryKey;
                    label: DictionaryKey;
                    icon: IconSvgElement;
                  }>
                ).map((feature) => (
                  <li
                    key={feature.label}
                    className="liquid-glass-muted flex items-start gap-2.5 text-sm leading-snug"
                  >
                    <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center text-[var(--palette-orange-800)]">
                      <HugeiconsIcon
                        icon={feature.icon}
                        strokeWidth={2}
                        className="size-4"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="liquid-glass-ink font-semibold">
                        {t(feature.name)}:
                      </span>{" "}
                      {t(feature.label)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
              <Link
                href={routes.register}
                className={cn(
                  chromeFrostGlaze,
                  "inline-flex h-10 w-fit items-center gap-1.5 rounded-full px-4 text-sm font-medium",
                  "transition-[transform,background] duration-200 ease-out hover:-translate-y-0.5",
                  "motion-reduce:transition-none motion-reduce:hover:transform-none",
                )}
              >
                {t("vendorGateCta")}
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  className="size-3.5"
                />
              </Link>
              <p className="liquid-glass-muted text-sm">
                {t("vendorGateLoginPrefix")}{" "}
                <Link
                  href={routes.login}
                  className="liquid-glass-ink font-medium underline-offset-4 hover:underline"
                >
                  {t("vendorGateLoginAction")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </MonitorSection>
  );

  const blueprint = categoryBlueprint(tor.category);
  const blueprintStyle = {
    "--blueprint-paper": blueprint.paper,
    "--blueprint-grid": blueprint.grid,
  } as CSSProperties;

  if (vendor) {
    return (
      <div>
        <section
          className="relative -mt-[144px] overflow-hidden category-blueprint text-foreground"
          style={blueprintStyle}
        >
          <div aria-hidden className={heroFade} />
          <ShellContent className="relative z-10">
            <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-[calc(144px+2rem)] sm:px-6 md:pb-16 md:pt-[calc(144px+3rem)]">
              <Link href={backHref} className={glassLink}>
                <HugeiconsIcon
                  icon={ArrowLeft01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
                {backLabel}
              </Link>
              <div className="mt-5 space-y-5">
                <h1 className="text-2xl font-semibold leading-snug tracking-tight md:text-[2rem] md:leading-[1.35]">
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
                            icon={DatabaseIcon}
                            strokeWidth={1.75}
                            className="size-5 shrink-0"
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
          </ShellContent>
        </section>

        <ShellContent>
          <div className="mx-auto max-w-6xl space-y-10 px-4 pb-12 pt-6 sm:px-6 md:space-y-12 md:pb-16 md:pt-8">
            {matchInsight}
            {facts}
            {brief}
            {requirements}
            {vendorExtras}
          </div>
        </ShellContent>
      </div>
    );
  }

  return (
    <div>
      <section
        className="relative -mt-[144px] overflow-hidden category-blueprint text-foreground"
        style={blueprintStyle}
      >
        <div aria-hidden className={heroFade} />
        <ShellContent className="relative z-10">
          <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-[calc(144px+2rem)] sm:px-6 md:pb-16 md:pt-[calc(144px+3rem)]">
            <Link href={catalog} className={glassLink}>
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                strokeWidth={2}
                className="size-4"
              />
              {t("backToListings")}
            </Link>
            <div className="mt-5 w-full max-w-5xl space-y-5">
              <h1 className="text-2xl font-semibold leading-snug tracking-tight md:text-[2rem] md:leading-[1.35]">
                {torTitle(tor, locale)}
              </h1>
              {sourceLabel || department ? (
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-base leading-[1.7] text-muted-foreground md:text-lg">
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
                          icon={DatabaseIcon}
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
              <SkillTags
                skills={tor.skills}
                className="mt-5 text-muted-foreground"
              />
            ) : null}
            <div className="mt-4">{actions}</div>
          </div>
        </ShellContent>
      </section>

      <ShellContent>
        <div className="mx-auto max-w-6xl space-y-10 px-4 pb-12 pt-6 sm:px-6 md:space-y-12 md:pb-16 md:pt-8">
          {facts}
          {brief}
          {requirements}
          {vendorExtras}
        </div>
      </ShellContent>
    </div>
  );
}
