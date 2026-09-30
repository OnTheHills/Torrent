"use client";

import type { CSSProperties } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Building03Icon,
  CheckmarkCircle02Icon,
  File01Icon,
  GridIcon,
} from "@hugeicons/core-free-icons";

import { MonitorSection } from "@/components/monitor/monitor-section";
import { useLocale } from "@/components/providers/locale-provider";
import { FrostCard } from "@/components/ui/frost-card";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

const CARDS: {
  key: "kpiSources" | "statCategories" | "statDraftLive" | "statPublished";
  hint: DictionaryKey;
  icon: IconSvgElement;
  tone: "default" | "accent" | "warning" | "warm";
}[] = [
  {
    key: "kpiSources",
    hint: "kpiSourcesHint",
    icon: Building03Icon,
    tone: "default",
  },
  {
    key: "statCategories",
    hint: "statCategoriesHint",
    icon: GridIcon,
    tone: "accent",
  },
  {
    key: "statDraftLive",
    hint: "statDraftLiveHint",
    icon: File01Icon,
    tone: "warning",
  },
  {
    key: "statPublished",
    hint: "statPublishedHint",
    icon: CheckmarkCircle02Icon,
    tone: "warm",
  },
];

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
  warning: {
    cardBg: "bg-[var(--palette-yellow-75)]",
    iconFg: "text-[var(--palette-yellow-700)]",
    ring: "color-mix(in srgb, var(--palette-yellow-300) 70%, transparent)",
    highlight: "color-mix(in srgb, var(--palette-yellow-50) 88%, transparent)",
  },
  warm: {
    cardBg: "bg-[var(--palette-orange-75)]",
    iconFg: "text-[var(--palette-orange-700)]",
    ring: "color-mix(in srgb, var(--palette-orange-300) 70%, transparent)",
    highlight: "color-mix(in srgb, var(--palette-orange-50) 88%, transparent)",
  },
} as const;

export function BudgetKpiStrip({
  values,
  isPending,
}: {
  values: {
    kpiSources: number;
    statCategories: number;
    statDraftLive: number;
    statPublished: number;
  };
  isPending?: boolean;
}) {
  const { t } = useLocale();

  return (
    <MonitorSection
      title={t("budgetSnapshotTitle")}
      description={t("budgetSnapshotSubtitle")}
    >
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {CARDS.map((card) => (
          <FrostCard
            key={card.key}
            className={cn(
              "flex h-full flex-col gap-4 rounded-lg p-6 md:p-5",
              TONE[card.tone].cardBg
            )}
            style={
              {
                "--surface-frost-ring": TONE[card.tone].ring,
                "--surface-frost-highlight": TONE[card.tone].highlight,
              } as CSSProperties
            }
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--palette-white)]">
                <HugeiconsIcon
                  icon={card.icon}
                  strokeWidth={2}
                  className={`size-5 ${TONE[card.tone].iconFg}`}
                />
              </span>
              <h3 className="text-xl font-semibold tracking-tight">
                {t(card.key)}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {isPending ? "—" : values[card.key]}
              </p>
              <p className="text-sm leading-[1.7] text-muted-foreground">
                {t(card.hint)}
              </p>
            </div>
          </FrostCard>
        ))}
      </div>
    </MonitorSection>
  );
}
