"use client";

import Link from "next/link";

import { useLocale } from "@/components/providers/locale-provider";
import { MatchBadge } from "@/components/tor/match-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { agencyShort } from "@/config/agencies";
import { routes } from "@/config/routes";
import {
  formatBudgetCompact,
  formatDate,
  getTorById,
  MOCK_MATCHES,
  torTitle,
} from "@/data/mock";

export function InboxView() {
  const { locale, t } = useLocale();

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden hero-atmosphere text-hero-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(72px+4rem)] sm:px-6 md:pb-12 md:pt-[calc(72px+6rem)]">
          <div className="mt-2 w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hero-muted">
              {t("navInbox")}
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
              {t("inboxTitle")}
            </h1>
            <p className="mt-5 text-base leading-[1.7] text-hero-muted md:text-lg">
              {t("inboxDescription")}
            </p>
          </div>
        </div>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <div className="mx-auto max-w-6xl space-y-4 px-4 py-12 sm:px-6 md:py-16">
        {MOCK_MATCHES.map((match) => {
          const tor = getTorById(match.torId);
          if (!tor) return null;
          return (
            <Card key={match.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <MatchBadge score={match.matchScore} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(match.matchedAt, locale)}
                  </span>
                </div>
                <CardTitle className="text-base">
                  <Link href={routes.app.tor(tor.id)} className="hover:text-primary">
                    {torTitle(tor, locale)}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {agencyShort(tor.agencyId, locale)} · {tor.department} ·{" "}
                  {formatBudgetCompact(tor.budgetThb, locale)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-2">
                  {match.reasons.map((reason) => (
                    <li
                      key={reason}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="gap-2">
                <Button asChild size="sm">
                  <Link href={routes.app.tor(tor.id)}>{t("viewTor")}</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={tor.egpUrl} target="_blank" rel="noreferrer">
                    {t("applyOnEgp")}
                  </a>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
