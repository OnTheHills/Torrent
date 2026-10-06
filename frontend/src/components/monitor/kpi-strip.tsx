"use client";

import type { CSSProperties } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon,
  FlashIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";

import { MonitorSection } from "@/components/monitor/monitor-section";
import { useLocale } from "@/components/providers/locale-provider";
import { FrostCard } from "@/components/ui/frost-card";
import { isPublishedWithinDays } from "@/data/mock";
import { fetchTors } from "@/lib/api";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

const CARDS: {
  key: "kpiTotal" | "kpiNew" | "kpiSuspicious";
  hint: DictionaryKey;
  icon: IconSvgElement;
  tone: "default" | "accent" | "warning";
}[] = [
  {
    key: "kpiTotal",
    hint: "kpiTotalHint",
    icon: SourceCodeIcon,
    tone: "default",
  },
  {
    key: "kpiNew",
    hint: "kpiNewHint",
    icon: FlashIcon,
    tone: "accent",
  },
  {
    key: "kpiSuspicious",
    hint: "kpiSuspiciousHint",
    icon: Alert02Icon,
    tone: "warning",
  },
];

const frostCard =
  "border-0 bg-[color-mix(in_srgb,var(--card-tint)_46%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 backdrop-blur-xl backdrop-saturate-150";

const TONE = {
  default: {
    cardBg: frostCard,
    tint: "var(--palette-teal-100)",
    iconFg: "text-[var(--palette-teal-700)]",
    ring: "color-mix(in srgb, var(--palette-teal-300) 55%, transparent)",
    highlight: "color-mix(in srgb, white 88%, transparent)",
  },
  accent: {
    cardBg: frostCard,
    tint: "var(--palette-blue-100)",
    iconFg: "text-[var(--palette-blue-800)]",
    ring: "color-mix(in srgb, var(--palette-blue-300) 55%, transparent)",
    highlight: "color-mix(in srgb, white 88%, transparent)",
  },
  warning: {
    cardBg: frostCard,
    tint: "var(--palette-yellow-100)",
    iconFg: "text-[var(--palette-yellow-700)]",
    ring: "color-mix(in srgb, var(--palette-yellow-300) 55%, transparent)",
    highlight: "color-mix(in srgb, white 88%, transparent)",
  },
} as const;

export function KpiStrip({ className }: { className?: string }) {
  const { t } = useLocale();
  const { data: tors = [], isPending } = useQuery({
    queryKey: ["tors"],
    queryFn: fetchTors,
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  const values = {
    kpiTotal: tors.length,
    kpiNew: tors.filter((tor) => isPublishedWithinDays(tor.publishedAt, 7, todayIso))
      .length,
    kpiSuspicious: tors.filter((tor) => tor.integrity === "suspicious").length,
  } as const;

  return (
    <MonitorSection
      bare
      className={className}
      title={t("kpiTitle")}
      description={t("kpiSubtitle")}
    >
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {CARDS.map((card) => (
          <FrostCard
            key={card.key}
            className={cn(
              "flex h-full flex-col gap-4 rounded-lg p-6 md:p-5",
              TONE[card.tone].cardBg
            )}
            style={
              {
                "--card-tint": TONE[card.tone].tint,
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
