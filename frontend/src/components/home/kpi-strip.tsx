"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon,
  FlashIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { FrostCard } from "@/components/ui/frost-card";
import { FrostPillMark } from "@/components/ui/frost-pill";
import { MOCK_STATS } from "@/data/mock";
import { cn } from "@/lib/utils";

const CARDS: {
  key: "kpiSoftware" | "kpiSuspicious" | "kpiNew";
  value: number;
  delta: string;
  icon: IconSvgElement;
  iconBg: string;
  iconFg: string;
  iconRing: string;
}[] = [
  {
    key: "kpiSoftware",
    value: MOCK_STATS.softwareTors,
    delta: MOCK_STATS.softwareDelta,
    icon: SourceCodeIcon,
    iconBg: "bg-[var(--palette-teal-75)]",
    iconFg: "text-[var(--palette-teal-700)]",
    iconRing:
      "ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)]",
  },
  {
    key: "kpiSuspicious",
    value: MOCK_STATS.suspiciousTors,
    delta: MOCK_STATS.suspiciousDelta,
    icon: Alert02Icon,
    iconBg: "bg-[var(--palette-red-75)]",
    iconFg: "text-[var(--palette-red-700)]",
    iconRing:
      "ring-[color-mix(in_srgb,var(--palette-red-400)_48%,transparent)]",
  },
  {
    key: "kpiNew",
    value: MOCK_STATS.newThisWeek,
    delta: MOCK_STATS.newDelta,
    icon: FlashIcon,
    iconBg: "bg-[var(--palette-orange-75)]",
    iconFg: "text-[var(--palette-orange-700)]",
    iconRing:
      "ring-[color-mix(in_srgb,var(--palette-orange-400)_48%,transparent)]",
  },
];

export function KpiStrip({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <ul className={cn("grid gap-4 sm:grid-cols-3 sm:gap-5", className)}>
      {CARDS.map((card) => (
        <FrostCard
          as="li"
          key={card.key}
          className="flex flex-col gap-3 rounded-lg p-5 md:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t(card.key)}
            </p>
            <FrostPillMark
              className={cn(
                card.iconBg,
                card.iconRing,
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)]",
              )}
            >
              <HugeiconsIcon
                icon={card.icon}
                strokeWidth={1.75}
                className={cn("size-4", card.iconFg)}
              />
            </FrostPillMark>
          </div>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {card.value}
          </p>
          <p className="text-xs text-muted-foreground">{card.delta}</p>
        </FrostCard>
      ))}
    </ul>
  );
}
