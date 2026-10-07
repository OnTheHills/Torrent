"use client";

import type { CSSProperties } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Building03Icon,
  CheckmarkCircle02Icon,
  File01Icon,
} from "@hugeicons/core-free-icons";

import { MonitorSection } from "@/components/monitor/monitor-section";
import { useLocale } from "@/components/providers/locale-provider";
import { FrostCard } from "@/components/ui/frost-card";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

const CARDS: {
  key: "kpiSources" | "statDraftLive" | "statPublished";
  hint: DictionaryKey;
  icon: IconSvgElement;
  tone: "default" | "warning" | "warm";
}[] = [
  {
    key: "kpiSources",
    hint: "kpiSourcesHint",
    icon: Building03Icon,
    tone: "default",
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

const frostCard =
  "border-0 bg-[color-mix(in_srgb,var(--card-tint)_46%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 backdrop-blur-xl backdrop-saturate-150";

const TONE = {
  default: {
    tint: "var(--palette-teal-100)",
    iconFg: "text-[var(--palette-teal-700)]",
    ring: "color-mix(in srgb, var(--palette-teal-300) 55%, transparent)",
  },
  warning: {
    tint: "var(--palette-yellow-100)",
    iconFg: "text-[var(--palette-yellow-700)]",
    ring: "color-mix(in srgb, var(--palette-yellow-300) 55%, transparent)",
  },
  warm: {
    tint: "var(--palette-orange-100)",
    iconFg: "text-[var(--palette-orange-700)]",
    ring: "color-mix(in srgb, var(--palette-orange-300) 55%, transparent)",
  },
} as const;

export function BudgetKpiStrip({
  values,
  isPending,
}: {
  values: {
    kpiSources: number;
    statDraftLive: number;
    statPublished: number;
  };
  isPending?: boolean;
}) {
  const { t } = useLocale();

  return (
    <MonitorSection
      bare
      title={t("budgetSnapshotTitle")}
      description={t("budgetSnapshotSubtitle")}
    >
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {CARDS.map((card) => (
          <FrostCard
            key={card.key}
            className={cn("flex h-full flex-col gap-4 rounded-lg p-6 md:p-5", frostCard)}
            style={
              {
                "--card-tint": TONE[card.tone].tint,
                "--surface-frost-ring": TONE[card.tone].ring,
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
