"use client";

import { useLocale } from "@/components/providers/locale-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  daysUntilDeadline,
  formatBudgetCompact,
  isPublishedWithinDays,
} from "@/data/mock";
import type { Tor } from "@/types/tor";

export function OpportunitiesKpiStrip({ tors }: { tors: Tor[] }) {
  const { locale, t } = useLocale();

  const newCount = tors.filter((tor) => isPublishedWithinDays(tor.publishedAt, 7)).length;
  const openingSoon = tors.filter((tor) => {
    const days = daysUntilDeadline(tor.deadline);
    return days >= 0 && days <= 14 && tor.lifecycle !== "awarded";
  }).length;
  const totalBudget = tors.reduce((sum, tor) => sum + tor.budgetThb, 0);

  const cards = [
    {
      key: "kpiTotal",
      value: String(tors.length),
      hint: t("kpiTotalBudgetHint"),
    },
    {
      key: "kpiNew",
      value: String(newCount),
      hint: t("kpiNewHint"),
    },
    {
      key: "kpiOpeningSoon",
      value: String(openingSoon),
      hint: t("kpiOpeningSoonHint"),
    },
    {
      key: "kpiTotalBudget",
      value: formatBudgetCompact(totalBudget, locale),
      hint: t("kpiTotalBudgetHint"),
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.key} size="sm">
          <CardHeader className="gap-2">
            <CardDescription className="text-xs uppercase tracking-[0.14em]">
              {t(card.key)}
            </CardDescription>
            <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
              {card.value}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
