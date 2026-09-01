"use client";

import Link from "next/link";

import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { AgencyBadge } from "@/components/tor/agency-badge";
import { IntegrityBadge } from "@/components/tor/integrity-badge";
import { LifecycleBadge } from "@/components/tor/lifecycle-badge";
import { MatchBadge } from "@/components/tor/match-badge";
import { SaveTorButton } from "@/components/tor/save-tor-button";
import { SkillTags } from "@/components/tor/skill-tags";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listingHref } from "@/config/routes";
import {
  formatBudgetCompact,
  formatDate,
  torAgencyLine,
  torTitle,
} from "@/data/mock";
import type { Tor } from "@/types/tor";

export function TorCard({ tor }: { tor: Tor }) {
  const { locale, t } = useLocale();
  const audience = useAudience();

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <AgencyBadge agencyId={tor.agencyId} />
            <LifecycleBadge lifecycle={tor.lifecycle} />
            {tor.integrity === "suspicious" ? (
              <IntegrityBadge status="suspicious" />
            ) : null}
          </div>
          {audience === "vendor" ? (
            <SaveTorButton
              torId={tor.id}
              size="icon"
              variant="ghost"
              showLabel={false}
              className="shrink-0"
            />
          ) : null}
        </div>
        <CardTitle className="text-base leading-snug">
          <Link href={listingHref(tor.id, audience)} className="hover:text-primary">
            {torTitle(tor, locale)}
          </Link>
        </CardTitle>
        <CardDescription>{torAgencyLine(tor, locale)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SkillTags skills={tor.skills} limit={4} />
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
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
              {t("deadline")}
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatDate(tor.deadline, locale)}
            </p>
          </div>
        </div>
        {audience === "vendor" && typeof tor.matchScore === "number" ? (
          <MatchBadge score={tor.matchScore} />
        ) : null}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" size="sm">
          <Link href={listingHref(tor.id, audience)}>{t("viewTor")}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
