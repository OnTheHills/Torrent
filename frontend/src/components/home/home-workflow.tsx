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

const frostBase =
  "shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent),0_10px_28px_rgb(0_0_0_/_0.06)] ring-1 backdrop-blur-xl backdrop-saturate-150";

const STAGES: {
  title: DictionaryKey;
  body: DictionaryKey;
  icon: IconSvgElement;
  fill: string;
}[] = [
  {
    title: "workflowCollectTitle",
    body: "workflowCollectBody",
    icon: Database01Icon,
    fill: "bg-[color-mix(in_srgb,var(--palette-orange-300)_52%,transparent)] ring-[color-mix(in_srgb,var(--palette-orange-400)_55%,transparent)]",
  },
  {
    title: "workflowClassifyTitle",
    body: "workflowClassifyBody",
    icon: FilterIcon,
    fill: "bg-[color-mix(in_srgb,var(--palette-yellow-300)_58%,transparent)] ring-[color-mix(in_srgb,var(--palette-yellow-400)_55%,transparent)]",
  },
  {
    title: "workflowEnrichTitle",
    body: "workflowEnrichBody",
    icon: Task01Icon,
    fill: "bg-[color-mix(in_srgb,var(--palette-green-600)_36%,transparent)] ring-[color-mix(in_srgb,var(--palette-green-600)_42%,transparent)]",
  },
  {
    title: "workflowDeliverTitle",
    body: "workflowDeliverBody",
    icon: Notification01Icon,
    fill: "bg-[color-mix(in_srgb,var(--palette-teal-300)_52%,transparent)] ring-[color-mix(in_srgb,var(--palette-teal-400)_55%,transparent)]",
  },
];

export function HomeWorkflow() {
  const { t } = useLocale();

  return (
    <HomeSection title={t("workflowTitle")} description={t("workflowSubtitle")}>
      <style>{`
        .workflow-chevron {
          clip-path: polygon(
            0 0,
            100% 0,
            100% calc(100% - 1rem),
            50% 100%,
            0 calc(100% - 1rem),
            50% 1rem
          );
        }
        @media (min-width: 768px) {
          .workflow-chevron {
            clip-path: polygon(
              0 0,
              calc(100% - 1.75rem) 0,
              100% 50%,
              calc(100% - 1.75rem) 100%,
              0 100%,
              1.75rem 50%
            );
          }
        }
      `}</style>

      <ol className="grid grid-cols-1 gap-x-1.5 gap-y-3 md:grid-cols-4">
        {STAGES.map((stage) => (
          <li key={stage.title} className="flex flex-col gap-3">
            <div
              className={cn(
                "workflow-chevron flex h-20 items-center justify-center px-8 text-foreground md:h-24 md:px-10",
                frostBase,
                stage.fill,
              )}
            >
              <h3 className="flex items-center justify-center gap-2.5 text-center text-xl font-semibold tracking-tight md:gap-3 md:text-2xl">
                <HugeiconsIcon
                  icon={stage.icon}
                  strokeWidth={2}
                  className="size-5 shrink-0 md:size-6"
                />
                {t(stage.title)}
              </h3>
            </div>
            <p className="px-1 text-sm leading-[1.65] text-muted-foreground md:pr-4">
              {t(stage.body)}
            </p>
          </li>
        ))}
      </ol>
    </HomeSection>
  );
}
