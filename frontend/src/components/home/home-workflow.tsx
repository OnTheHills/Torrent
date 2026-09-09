"use client";

import { HomeSection } from "@/components/home/home-section";
import { useLocale } from "@/components/providers/locale-provider";
import { buttonVariants } from "@/components/ui/button";
import { FrostCard } from "@/components/ui/frost-card";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const STAGES = [
  {
    title: "workflowCollectTitle",
    body: "workflowCollectBody",
    cardBg: "bg-[var(--palette-purple-75)] backdrop-blur-none",
    cardRing:
      "ring-[color-mix(in_srgb,var(--palette-purple-400)_48%,transparent)]",
  },
  {
    title: "workflowClassifyTitle",
    body: "workflowClassifyBody",
    cardBg: "bg-[var(--palette-blue-75)] backdrop-blur-none",
    cardRing:
      "ring-[color-mix(in_srgb,var(--palette-blue-400)_48%,transparent)]",
  },
  {
    title: "workflowEnrichTitle",
    body: "workflowEnrichBody",
    cardBg: "bg-[var(--palette-teal-75)] backdrop-blur-none",
    cardRing:
      "ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)]",
  },
  {
    title: "workflowDeliverTitle",
    body: "workflowDeliverBody",
    cardBg: "bg-[var(--palette-yellow-75)] backdrop-blur-none",
    cardRing:
      "ring-[color-mix(in_srgb,var(--palette-yellow-400)_48%,transparent)]",
  },
] as const satisfies {
  title: DictionaryKey;
  body: DictionaryKey;
  cardBg: string;
  cardRing: string;
}[];

export function HomeWorkflow() {
  const { t } = useLocale();

  return (
    <HomeSection
      eyebrow={t("workflowEyebrow")}
      title={t("workflowTitle")}
      description={t("workflowSubtitle")}
    >
      <Surface className="space-y-4 bg-surface p-5 ring-transparent md:p-6">
        <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((stage, index) => (
            <FrostCard
              as="li"
              key={stage.title}
              className={cn(
                "flex h-full flex-col gap-3 rounded-lg p-6 md:p-5",
                stage.cardBg,
                stage.cardRing,
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    buttonVariants({ variant: "outline", size: "icon" }),
                    "pointer-events-none font-heading text-xs tabular-nums",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="min-w-0 text-xl font-semibold tracking-tight">
                  {t(stage.title)}
                </h3>
              </div>
              <p className="text-sm leading-[1.7] text-muted-foreground">
                {t(stage.body)}
              </p>
            </FrostCard>
          ))}
        </ol>
      </Surface>
    </HomeSection>
  );
}
