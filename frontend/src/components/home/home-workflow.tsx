"use client";

import {
  Database01Icon,
  FilterIcon,
  Notification01Icon,
  Task01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import { HomeSection } from "@/components/home/home-section";
import { useLocale } from "@/components/providers/locale-provider";
import { FrostCard } from "@/components/ui/frost-card";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

/** Same frost sheet language as the coverage feed folders above. */
const frostSheet =
  "border-0 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent),0_10px_28px_rgb(0_0_0_/_0.06)] ring-1 backdrop-blur-xl backdrop-saturate-150";

const STAGES: {
  title: DictionaryKey;
  body: DictionaryKey;
  icon: IconSvgElement;
  /** Soft frosted tint — same recipe as folder paper peeks. */
  fill: string;
}[] = [
  {
    title: "workflowCollectTitle",
    body: "workflowCollectBody",
    icon: Database01Icon,
    fill: "bg-[color-mix(in_srgb,var(--palette-orange-300)_42%,transparent)] ring-[color-mix(in_srgb,var(--palette-orange-400)_48%,transparent)]",
  },
  {
    title: "workflowClassifyTitle",
    body: "workflowClassifyBody",
    icon: FilterIcon,
    fill: "bg-[color-mix(in_srgb,var(--palette-yellow-300)_40%,transparent)] ring-[color-mix(in_srgb,var(--palette-yellow-400)_46%,transparent)]",
  },
  {
    title: "workflowEnrichTitle",
    body: "workflowEnrichBody",
    icon: Task01Icon,
    fill: "bg-[color-mix(in_srgb,var(--palette-green-300)_45%,transparent)] ring-[color-mix(in_srgb,var(--palette-green-400)_55%,transparent)]",
  },
  {
    title: "workflowDeliverTitle",
    body: "workflowDeliverBody",
    icon: Notification01Icon,
    fill: "bg-[color-mix(in_srgb,var(--palette-teal-400)_42%,transparent)] ring-[color-mix(in_srgb,var(--palette-teal-400)_52%,transparent)]",
  },
];

export function HomeWorkflow() {
  const { t } = useLocale();

  return (
    <HomeSection title={t("workflowTitle")} description={t("workflowSubtitle")}>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((stage, index) => (
          <li key={stage.title}>
            <FrostCard
              className={cn(
                frostSheet,
                stage.fill,
                "flex h-full min-h-[11rem] flex-col rounded-2xl p-5 text-foreground md:p-6",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                  {index + 1}. {t(stage.title)}
                </h3>
                <HugeiconsIcon
                  icon={stage.icon}
                  strokeWidth={2}
                  className="size-5 shrink-0 md:size-6"
                />
              </div>
              <p className="mt-auto pt-6 text-sm leading-[1.65] text-foreground/75">
                {t(stage.body)}
              </p>
            </FrostCard>
          </li>
        ))}
      </ol>
    </HomeSection>
  );
}
