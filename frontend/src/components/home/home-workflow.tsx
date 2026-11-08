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
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

const STAGES: {
  title: DictionaryKey;
  body: DictionaryKey;
  icon: IconSvgElement;
  iconFg: string;
  scene: string;
}[] = [
  {
    title: "workflowCollectTitle",
    body: "workflowCollectBody",
    icon: Database01Icon,
    iconFg: "text-[var(--palette-orange-800)]",
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-orange-300)_52%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-orange-400)_46%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-orange-600)_40%,var(--palette-gray-200)))]",
  },
  {
    title: "workflowClassifyTitle",
    body: "workflowClassifyBody",
    icon: FilterIcon,
    iconFg: "text-[var(--palette-yellow-800)]",
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-yellow-300)_50%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-yellow-400)_44%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-yellow-600)_38%,var(--palette-gray-200)))]",
  },
  {
    title: "workflowEnrichTitle",
    body: "workflowEnrichBody",
    icon: Task01Icon,
    iconFg: "text-[var(--palette-green-800)]",
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-green-300)_52%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-green-400)_46%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-green-600)_40%,var(--palette-gray-200)))]",
  },
  {
    title: "workflowDeliverTitle",
    body: "workflowDeliverBody",
    icon: Notification01Icon,
    iconFg: "text-[var(--palette-teal-800)]",
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-teal-300)_52%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-teal-400)_46%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-teal-600)_40%,var(--palette-gray-200)))]",
  },
];

export function HomeWorkflow() {
  const { t } = useLocale();

  return (
    <HomeSection title={t("workflowTitle")} description={t("workflowSubtitle")}>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((stage, index) => (
          <li key={stage.title} className="relative">
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 rounded-2xl",
                stage.scene,
              )}
            />
            <article
              className={cn(
                "liquid-glass-card relative flex h-full min-h-[11rem] flex-col rounded-2xl p-5 md:p-6",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="liquid-glass-ink text-xl font-semibold tracking-tight md:text-2xl">
                  {index + 1}. {t(stage.title)}
                </h3>
                <HugeiconsIcon
                  icon={stage.icon}
                  strokeWidth={2}
                  className={cn("size-5 shrink-0 md:size-6", stage.iconFg)}
                />
              </div>
              <p className="liquid-glass-muted mt-auto pt-6 text-sm leading-[1.65]">
                {t(stage.body)}
              </p>
            </article>
          </li>
        ))}
      </ol>
    </HomeSection>
  );
}
