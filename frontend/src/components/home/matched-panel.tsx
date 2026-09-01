"use client";

import Link from "next/link";

import { useLocale } from "@/components/providers/locale-provider";
import { IntegrityBadge } from "@/components/tor/integrity-badge";
import { MatchBadge } from "@/components/tor/match-badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { routes } from "@/config/routes";
import {
  formatBudgetCompact,
  formatDate,
  getTorById,
  MOCK_MATCHES,
  torAgencyLine,
  torTitle,
} from "@/data/mock";

export function MatchedPanel() {
  const { locale, t } = useLocale();
  const items = MOCK_MATCHES.map((match) => ({
    match,
    tor: getTorById(match.torId),
  })).filter((item) => item.tor);

  return (
    <Card className="h-full">
      <CardHeader className="gap-2 border-b border-border pb-5">
        <CardTitle className="text-lg md:text-xl">{t("matchedTitle")}</CardTitle>
        <CardAction>
          <Link
            href={routes.tors}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("viewAll")}
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-0">
        <ul className="divide-y divide-border">
          {items.map(({ match, tor }) =>
            tor ? (
              <li key={match.id}>
                <Link
                  href={routes.tor(tor.id)}
                  className="block py-4 transition-colors hover:text-primary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold">
                        {torTitle(tor, locale)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {torAgencyLine(tor, locale)}
                      </p>
                      {tor.integrity === "suspicious" ? (
                        <IntegrityBadge status="suspicious" />
                      ) : null}
                    </div>
                    <MatchBadge score={match.matchScore} />
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {formatBudgetCompact(tor.budgetThb, locale)}
                    </span>
                    <span>{formatDate(tor.deadline, locale)}</span>
                  </div>
                </Link>
              </li>
            ) : null
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
