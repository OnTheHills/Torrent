"use client";

import type { CSSProperties } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  File01Icon,
  Megaphone01Icon,
} from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { FrostCard } from "@/components/ui/frost-card";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";
import type { TorLifecycle } from "@/types/tor";

const STAGES: Record<
  TorLifecycle,
  {
    label: DictionaryKey;
    hint: DictionaryKey;
    icon: IconSvgElement;
    tone: {
      cardBg: string;
      iconFg: string;
      ring: string;
      highlight: string;
    };
  }
> = {
  draft: {
    label: "draft",
    hint: "stageDraftHint",
    icon: File01Icon,
    tone: {
      cardBg: "bg-[var(--palette-yellow-75)]",
      iconFg: "text-[var(--palette-yellow-700)]",
      ring: "color-mix(in srgb, var(--palette-yellow-300) 70%, transparent)",
      highlight: "color-mix(in srgb, var(--palette-yellow-50) 88%, transparent)",
    },
  },
  published: {
    label: "published",
    hint: "stagePublishedHint",
    icon: Megaphone01Icon,
    tone: {
      cardBg: "bg-[var(--palette-orange-75)]",
      iconFg: "text-[var(--palette-orange-700)]",
      ring: "color-mix(in srgb, var(--palette-orange-300) 70%, transparent)",
      highlight: "color-mix(in srgb, var(--palette-orange-50) 88%, transparent)",
    },
  },
  awarded: {
    label: "awarded",
    hint: "stageAwardedHint",
    icon: CheckmarkCircle02Icon,
    tone: {
      cardBg: "bg-[var(--palette-teal-75)]",
      iconFg: "text-[var(--palette-teal-700)]",
      ring: "color-mix(in srgb, var(--palette-teal-300) 70%, transparent)",
      highlight: "color-mix(in srgb, var(--palette-teal-50) 88%, transparent)",
    },
  },
};

export function TorStage({ lifecycle }: { lifecycle: TorLifecycle }) {
  const { t } = useLocale();
  const stage = STAGES[lifecycle] ?? STAGES.draft;

  return (
    <FrostCard
      className={cn("flex h-full flex-col gap-4 rounded-lg p-6 md:p-5", stage.tone.cardBg)}
      style={
        {
          "--surface-frost-ring": stage.tone.ring,
          "--surface-frost-highlight": stage.tone.highlight,
        } as CSSProperties
      }
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--palette-white)]">
          <HugeiconsIcon
            icon={stage.icon}
            strokeWidth={2}
            className={cn("size-5", stage.tone.iconFg)}
          />
        </span>
        <h3 className="text-xl font-semibold tracking-tight">{t("lifecycle")}</h3>
      </div>
      <div className="text-right">
        <p className="text-3xl font-semibold tracking-tight">{t(stage.label)}</p>
        <p className="text-sm leading-[1.7] text-muted-foreground">
          {t(stage.hint)}
        </p>
      </div>
    </FrostCard>
  );
}
