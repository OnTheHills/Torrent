"use client";

import Link from "next/link";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listingHref, routes } from "@/config/routes";
import {
  formatBudgetCompact,
  formatDate,
  getBenchmarkForCategory,
  getPriceAnalysisStatus,
  torAgencyLine,
  torTitle,
} from "@/data/mock";
import type { Tor } from "@/types/tor";

export function TorDetail({ tor }: { tor: Tor }) {
  const { locale, t } = useLocale();
  const audience = useAudience();
  const vendor = audience === "vendor";
  const catalog = vendor ? routes.app.tors : routes.tors;
  const benchmark = getBenchmarkForCategory(tor.category);
  const vsMedian = benchmark
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

  return (
    <div
      className={
        vendor
          ? "space-y-8"
          : "mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 md:py-14"
      }
    >
      <Button asChild variant="ghost" size="lg" className="-ml-2">
        <Link href={catalog}>← {t("navListings")}</Link>
      </Button>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <AgencyBadge agencyId={tor.agencyId} />
          <SourceBadge kind={tor.sourceKind} />
          <LifecycleBadge lifecycle={tor.lifecycle} />
          <IntegrityBadge status={tor.integrity} />
          {vendor && typeof tor.matchScore === "number" ? (
            <MatchBadge score={tor.matchScore} />
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{tor.refId}</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {torTitle(tor, locale)}
        </h1>
        <p className="text-muted-foreground">{torAgencyLine(tor, locale)}</p>
        <SkillTags skills={tor.skills} />
      </div>

      <dl className="grid gap-4 border-y border-border py-5 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t("budget")}
          </dt>
          <dd className="mt-1 text-lg font-medium tabular-nums">
            {formatBudgetCompact(tor.budgetThb, locale)}
          </dd>
          {benchmark && vsLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("budgetNote")}: {formatBudgetCompact(benchmark.medianThb, locale)}{" "}
              · {vsLabel}
            </p>
          ) : null}
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t("publishedAt")}
          </dt>
          <dd className="mt-1 text-lg font-medium">
            {formatDate(tor.publishedAt, locale)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t("deadline")}
          </dt>
          <dd className="mt-1 text-lg font-medium">
            {formatDate(tor.deadline, locale)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <a href={tor.egpUrl} target="_blank" rel="noreferrer">
            {t("openEgp")}
          </a>
        </Button>
        {vendor ? <SaveTorButton torId={tor.id} /> : null}
        <Button asChild size="lg" variant="outline">
          <Link href={routes.dashboard}>{t("budgetDashboard")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-2 border-b border-border pb-5">
          <CardTitle className="text-lg md:text-xl">{t("summary")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {locale === "th" ? tor.summaryTh : tor.summary}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2 border-b border-border pb-5">
          <CardTitle className="text-lg md:text-xl">{t("requirements")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            {tor.requirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {vendor ? <ProfileFitPanel tor={tor} /> : null}

      {vendor && tor.matchReasons?.length ? (
        <Card className="bg-primary/5 ring-primary/20">
          <CardHeader className="gap-2">
            <CardTitle className="text-lg md:text-xl">{t("whyMatch")}</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      ) : null}

      {!vendor ? (
        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-lg">{t("vendorGateTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("vendorGateBody")}
            </p>
            <Button asChild size="sm">
              <Link href={listingHref(tor.id, "vendor")}>{t("vendorGateCta")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
