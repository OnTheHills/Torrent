"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon,
  FlashIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";

import { MonitorSection } from "@/components/monitor/monitor-section";
import { useLocale } from "@/components/providers/locale-provider";
import { isPublishedWithinDays } from "@/data/mock";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { torsQueryOptions } from "@/lib/tors-query";
import { cn } from "@/lib/utils";

const CARDS: {
  key: "kpiTotal" | "kpiNew" | "kpiSuspicious";
  hint: DictionaryKey;
  icon: IconSvgElement;
  iconFg: string;
  scene: string;
}[] = [
  {
    key: "kpiTotal",
    hint: "kpiTotalHint",
    icon: SourceCodeIcon,
    iconFg: "text-[var(--palette-teal-800)]",
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-teal-300)_55%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-teal-400)_48%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-teal-600)_42%,var(--palette-gray-200)))]",
  },
  {
    key: "kpiNew",
    hint: "kpiNewHint",
    icon: FlashIcon,
    iconFg: "text-[var(--palette-blue-800)]",
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-blue-300)_52%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-blue-400)_46%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-blue-600)_40%,var(--palette-gray-200)))]",
  },
  {
    key: "kpiSuspicious",
    hint: "kpiSuspiciousHint",
    icon: Alert02Icon,
    iconFg: "text-[var(--palette-orange-800)]",
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-yellow-100)_48%,var(--palette-orange-150)),color-mix(in_srgb,var(--palette-yellow-200)_42%,var(--palette-orange-200))_48%,color-mix(in_srgb,var(--palette-yellow-300)_38%,var(--palette-orange-300)))]",
  },
];

export function KpiStrip({ className }: { className?: string }) {
  const { t } = useLocale();
  const { data: tors = [], isPending } = useQuery(torsQueryOptions);

  const todayIso = new Date().toISOString().slice(0, 10);
  const values = {
    kpiTotal: tors.length,
    kpiNew: tors.filter((tor) =>
      isPublishedWithinDays(tor.publishedAt, 7, todayIso),
    ).length,
    kpiSuspicious: tors.filter((tor) => tor.integrity === "suspicious").length,
  } as const;

  return (
    <MonitorSection
      bare
      className={className}
      title={t("kpiTitle")}
      description={t("kpiSubtitle")}
    >
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {CARDS.map((card) => (
          <li key={card.key} className="relative">
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 rounded-2xl",
                card.scene,
              )}
            />
            <article
              className={cn(
                "liquid-glass-card relative flex h-full flex-col gap-4 rounded-2xl p-5 md:p-6",
              )}
            >
              <div className="flex items-center gap-2.5">
                <HugeiconsIcon
                  icon={card.icon}
                  strokeWidth={2}
                  className={cn("size-5 shrink-0", card.iconFg)}
                />
                <h3 className="liquid-glass-ink text-xl font-semibold tracking-tight">
                  {t(card.key)}
                </h3>
              </div>
              <div className="text-right">
                <p className="liquid-glass-ink text-3xl font-semibold tracking-tight tabular-nums">
                  {isPending ? "—" : values[card.key]}
                </p>
                <p className="liquid-glass-muted text-sm leading-[1.7]">
                  {t(card.hint)}
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </MonitorSection>
  );
}
