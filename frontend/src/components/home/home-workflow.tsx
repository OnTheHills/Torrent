"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Database01Icon,
  Notification01Icon,
  SparklesIcon,
  Task01Icon,
} from "@hugeicons/core-free-icons";

import { HomeSection } from "@/components/home/home-section";
import { useLocale } from "@/components/providers/locale-provider";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const STAGES: {
  title: DictionaryKey;
  body: DictionaryKey;
  icon: IconSvgElement;
}[] = [
  { title: "workflowCollectTitle", body: "workflowCollectBody", icon: Database01Icon },
  { title: "workflowClassifyTitle", body: "workflowClassifyBody", icon: SparklesIcon },
  { title: "workflowEnrichTitle", body: "workflowEnrichBody", icon: Task01Icon },
  { title: "workflowDeliverTitle", body: "workflowDeliverBody", icon: Notification01Icon },
];

export function HomeWorkflow() {
  const { t } = useLocale();

  return (
    <HomeSection
      eyebrow={t("workflowEyebrow")}
      title={t("workflowTitle")}
      description={t("workflowSubtitle")}
    >
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STAGES.map((stage, index) => (
          <li
            key={stage.title}
            className="flex h-full flex-col gap-3 rounded-[8px] bg-card p-6 ring-1 ring-foreground/10"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-[8px] bg-[var(--palette-teal-100)]">
                <HugeiconsIcon
                  icon={stage.icon}
                  strokeWidth={1.75}
                  className="size-5 text-[var(--palette-teal-700)]"
                />
              </span>
              <span className="font-heading text-sm tabular-nums text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="text-base font-semibold tracking-tight">{t(stage.title)}</h3>
            <p className="text-sm leading-[1.7] text-muted-foreground">{t(stage.body)}</p>
          </li>
        ))}
      </ol>
    </HomeSection>
  );
}
