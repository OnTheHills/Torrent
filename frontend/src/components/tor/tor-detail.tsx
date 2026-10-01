"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Briefcase01Icon,
  Calendar03Icon,
  Clock01Icon,
  File01Icon,
  LinkSquare02Icon,
  Money01Icon,
} from "@hugeicons/core-free-icons";

import { MonitorSection } from "@/components/monitor/monitor-section";
import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { AgencyBadge } from "@/components/tor/agency-badge";
import { IntegrityBadge } from "@/components/tor/integrity-badge";
import { LifecycleBadge } from "@/components/tor/lifecycle-badge";
import { MatchBadge } from "@/components/tor/match-badge";
import { ProfileFitPanel } from "@/components/tor/profile-fit-panel";
import { SaveTorButton } from "@/components/tor/save-tor-button";
import { SourceBadge } from "@/components/tor/source-badge";
import { SkillTags } from "@/components/tor/skill-tags";
import { TorStage } from "@/components/tor/tor-stage";
import { Button } from "@/components/ui/button";
import { FrostCard, FrostPill } from "@/components/ui/frost-card";
import { listingHref, routes } from "@/config/routes";
import {
  formatBudgetCompact,
  formatBudgetYear,
  formatDate,
  getPriceAnalysisStatus,
  torAgencyLine,
  torTitle,
} from "@/data/mock";
import { buildBudgetBenchmarks, getBenchmarkForCategory } from "@/lib/budget";
import { cn } from "@/lib/utils";
import type { Tor } from "@/types/tor";

const TONE = {
  default: {
    cardBg: "bg-[var(--palette-teal-75)]",
    iconFg: "text-[var(--palette-teal-700)]",
    ring: "color-mix(in srgb, var(--palette-teal-300) 70%, transparent)",
    highlight: "color-mix(in srgb, var(--palette-teal-50) 88%, transparent)",
  },
  accent: {
    cardBg: "bg-[var(--palette-blue-75)]",
    iconFg: "text-[var(--palette-blue-800)]",
    ring: "color-mix(in srgb, var(--palette-blue-300) 70%, transparent)",
    highlight: "color-mix(in srgb, var(--palette-blue-50) 88%, transparent)",
  },
  warm: {
    cardBg: "bg-[var(--palette-orange-75)]",
    iconFg: "text-[var(--palette-orange-700)]",
    ring: "color-mix(in srgb, var(--palette-orange-300) 70%, transparent)",
    highlight: "color-mix(in srgb, var(--palette-orange-50) 88%, transparent)",
  },
} as const;

function FactCard({
  title,
  value,
  pills,
  icon,
  tone,
}: {
  title: string;
  value: string;
  pills?: string[];
  icon: IconSvgElement;
  tone: keyof typeof TONE;
}) {
  return (
    <FrostCard
      className={cn(
        "flex h-full flex-col gap-4 rounded-lg p-6 md:p-5",
        TONE[tone].cardBg,
      )}
      style={
        {
          "--surface-frost-ring": TONE[tone].ring,
          "--surface-frost-highlight": TONE[tone].highlight,
        } as CSSProperties
      }
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--palette-white)]">
          <HugeiconsIcon
            icon={icon}
            strokeWidth={2}
            className={`size-5 ${TONE[tone].iconFg}`}
          />
        </span>
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      </div>
      <div className="text-right">
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
      </div>
      {pills?.length ? (
        <div className="mt-auto flex flex-wrap justify-end gap-1.5">
          {pills.map((pill) => (
            <FrostPill key={pill}>{pill}</FrostPill>
          ))}
        </div>
      ) : null}
    </FrostCard>
  );
}

export function TorDetail({
  benchmarkTors,
  tor,
}: {
  benchmarkTors?: Tor[];
  tor: Tor;
}) {
  const { locale, t } = useLocale();
  const audience = useAudience();
  const vendor = audience === "vendor";
  const catalog = vendor ? routes.app.tors : routes.tors;
  const benchmarks = buildBudgetBenchmarks(benchmarkTors?.length ? benchmarkTors : [tor]);
  const benchmark = getBenchmarkForCategory(benchmarks, tor.category);
  const hasBudget = Number.isFinite(tor.budgetThb) && tor.budgetThb > 0;
  const hasDeadline = Boolean(tor.deadline);
  const summary = (
    locale === "th" ? tor.summaryTh || tor.summary : tor.summary || tor.summaryTh
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
  const budgetCompareHint = [
    hasBudget && benchmark
      ? `${t("budgetMedian")} ${formatBudgetCompact(benchmark.medianThb, locale)}`
      : null,
    vsLabel,
  ]
    .filter(Boolean)
    .join(" · ");
  const budgetPills = [
    tor.budgetYear ? `${t("budgetYear")} ${formatBudgetYear(tor.budgetYear)}` : null,
    budgetCompareHint || null,
  ].filter((pill): pill is string => Boolean(pill));
  const provenance =
    summary && tor.ocr?.status === "ok"
      ? tor.ocr.method === "text"
        ? t("textFromPlanPdf")
        : t("ocrFromPlanPdf")
      : null;
  const listedLine = tor.listedBecause
    ? `${t("listedBecause")}: ${tor.listedBecause}${tor.category ? ` · ${tor.category}` : ""}`
    : tor.category
      ? `${t("colCategory")}: ${tor.category}`
      : null;

  const badges = (
    <div className="flex flex-wrap items-center gap-2">
      <AgencyBadge agencyId={tor.agencyId} />
      <SourceBadge kind={tor.sourceKind} />
      <LifecycleBadge lifecycle={tor.lifecycle} />
      <IntegrityBadge status={tor.integrity} />
      {vendor && typeof tor.matchScore === "number" ? (
        <MatchBadge score={tor.matchScore} />
      ) : null}
    </div>
  );

  const actions = (
    <div className="flex flex-wrap gap-3">
      <Button asChild size="lg" variant={vendor ? "default" : "orange"}>
        <a href={tor.egpUrl} target="_blank" rel="noreferrer">
          {t("openEgp")}
          <HugeiconsIcon icon={LinkSquare02Icon} strokeWidth={2} />
        </a>
      </Button>
      {tor.ocr?.fileUrl ? (
        <Button asChild size="lg" variant="outline">
          <a href={tor.ocr.fileUrl} target="_blank" rel="noreferrer">
            {t("openPlanPdf")}
            <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
          </a>
        </Button>
      ) : null}
      {vendor ? <SaveTorButton torId={tor.id} /> : null}
      <Button asChild size="lg" variant="outline">
        <Link href={routes.dashboard}>{t("budgetDashboard")}</Link>
      </Button>
    </div>
  );

  const facts = (
    <MonitorSection
      title={t("detailFactsTitle")}
      description={t("detailFactsDescription")}
    >
      <div
        className={cn(
          "grid gap-3 sm:gap-4",
          hasDeadline
            ? "sm:grid-cols-2 lg:grid-cols-4"
            : "sm:grid-cols-3",
        )}
      >
        <FactCard
          title={t("budget")}
          value={formatBudgetCompact(tor.budgetThb, locale)}
          pills={budgetPills}
          icon={Money01Icon}
          tone="default"
        />
        <FactCard
          title={t("publishedAt")}
          value={formatDate(tor.publishedAt, locale)}
          icon={Calendar03Icon}
          tone="accent"
        />
        {hasDeadline ? (
          <FactCard
            title={t("deadline")}
            value={formatDate(tor.deadline, locale)}
            icon={Clock01Icon}
            tone="warm"
          />
        ) : null}
        <TorStage lifecycle={tor.lifecycle} />
      </div>
    </MonitorSection>
  );

  const brief = (
    <MonitorSection title={t("summary")}>
      <FrostCard className="space-y-3 rounded-lg p-6 md:p-5">
        <p className="text-sm leading-[1.7] text-muted-foreground">
          {summary || missingBrief}
        </p>
        {provenance ? (
          <p className="text-xs text-muted-foreground">{provenance}</p>
        ) : null}
      </FrostCard>
    </MonitorSection>
  );

  const requirements = tor.requirements.length ? (
    <MonitorSection title={t("requirements")}>
      <FrostCard className="space-y-3 rounded-lg p-6 md:p-5">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-[1.7] text-muted-foreground">
          {tor.requirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {tor.ocr?.status === "ok" ? (
          <p className="text-xs text-muted-foreground">
            {tor.ocr.method === "text" ? t("textFromPlanPdf") : t("ocrFromPlanPdf")}
          </p>
        ) : null}
      </FrostCard>
    </MonitorSection>
  ) : null;

  const vendorExtras = vendor ? (
    <>
      <ProfileFitPanel tor={tor} />
      {tor.matchReasons?.length ? (
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
      ) : null}
    </>
  ) : (
    <MonitorSection title={t("vendorGateTitle")} description={t("vendorGateBody")}>
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
      <div className="space-y-10 md:space-y-12">
        <div className="space-y-5">
          <Button asChild variant="ghost" size="lg" className="-ml-2">
            <Link href={catalog}>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              {t("backToListings")}
            </Link>
          </Button>
          {badges}
          <p className="text-xs text-muted-foreground">{tor.refId}</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl md:leading-[1.15]">
            {torTitle(tor, locale)}
          </h1>
          <p className="text-muted-foreground">{torAgencyLine(tor, locale)}</p>
          {listedLine ? (
            <p className="text-sm text-muted-foreground">{listedLine}</p>
          ) : null}
          {tor.skills.length ? <SkillTags skills={tor.skills} /> : null}
          {actions}
        </div>
        {facts}
        {brief}
        {requirements}
        {vendorExtras}
      </div>
    );
  }

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden hero-atmosphere text-hero-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(72px+4rem)] sm:px-6 md:pb-12 md:pt-[calc(72px+6rem)]">
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="-ml-2 text-hero-foreground hover:bg-hero-foreground/8"
          >
            <Link href={catalog}>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              {t("backToListings")}
            </Link>
          </Button>
          <div className="mt-6 w-full max-w-5xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hero-muted">
              {tor.refId}
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl md:leading-[1.15]">
              {torTitle(tor, locale)}
            </h1>
            <p className="mt-5 text-base leading-[1.7] text-hero-muted md:text-lg">
              {torAgencyLine(tor, locale)}
            </p>
            {listedLine ? (
              <p className="mt-2 text-sm leading-[1.7] text-hero-muted">
                {listedLine}
              </p>
            ) : null}
          </div>
          <div className="mt-5">{badges}</div>
          {tor.skills.length ? (
            <SkillTags
              skills={tor.skills}
              className="mt-3 text-hero-muted"
            />
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
