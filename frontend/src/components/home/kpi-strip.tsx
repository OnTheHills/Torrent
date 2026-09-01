"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon,
  File01Icon,
  FlashIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MOCK_STATS } from "@/data/mock";
import { cn } from "@/lib/utils";

const CARDS: {
  key: "kpiTotal" | "kpiSoftware" | "kpiSuspicious" | "kpiNew";
  value: number;
  delta: string;
  icon: IconSvgElement;
  tone: "default" | "accent" | "warning" | "fresh";
}[] = [
  {
    key: "kpiTotal",
    value: MOCK_STATS.totalTors,
    delta: MOCK_STATS.totalDelta,
    icon: File01Icon,
    tone: "default",
  },
  {
    key: "kpiSoftware",
    value: MOCK_STATS.softwareTors,
    delta: MOCK_STATS.softwareDelta,
    icon: SourceCodeIcon,
    tone: "accent",
  },
  {
    key: "kpiSuspicious",
    value: MOCK_STATS.suspiciousTors,
    delta: MOCK_STATS.suspiciousDelta,
    icon: Alert02Icon,
    tone: "warning",
  },
  {
    key: "kpiNew",
    value: MOCK_STATS.newThisWeek,
    delta: MOCK_STATS.newDelta,
    icon: FlashIcon,
    tone: "fresh",
  },
];

const TONE = {
  default: "bg-secondary text-secondary-foreground",
  accent: "bg-accent/15 text-accent-foreground",
  warning: "bg-warning text-warning-foreground",
  fresh: "bg-primary/12 text-primary",
} as const;

export function KpiStrip({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4", className)}>
      {CARDS.map((card) => (
        <Card
          key={card.key}
          size="sm"
          className="bg-card/95 shadow-sm backdrop-blur-md"
        >
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-3">
              <CardDescription className="text-[0.65rem] font-medium uppercase tracking-[0.14em]">
                {t(card.key)}
              </CardDescription>
              <span
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-md",
                  TONE[card.tone]
                )}
              >
                <HugeiconsIcon icon={card.icon} strokeWidth={1.75} className="size-4" />
              </span>
            </div>
            <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
              {card.value}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{card.delta}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
