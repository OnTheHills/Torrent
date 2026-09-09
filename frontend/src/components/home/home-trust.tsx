"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

import { HomeSection } from "@/components/home/home-section";
import { useLocale } from "@/components/providers/locale-provider";
import { FrostPill, FrostPillMark } from "@/components/ui/frost-pill";
import { Surface } from "@/components/ui/surface";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const COMMITMENTS: DictionaryKey[] = [
  "trustSource",
  "trustFlags",
  "trustNoBidding",
  "trustAdvisory",
  "trustAwarded",
];

export function HomeTrust() {
  const { t } = useLocale();

  return (
    <HomeSection
      eyebrow={t("trustEyebrow")}
      title={t("trustTitle")}
      description={t("trustSubtitle")}
    >
      <Surface className="space-y-4 bg-surface p-5 ring-transparent md:p-6">
        <ul className="grid gap-3 md:grid-cols-2">
          {COMMITMENTS.map((commitment) => (
            <FrostPill as="li" 
                       key={commitment} 
            >
              <FrostPillMark className="bg-foreground/8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)] ring-foreground/18">
                <HugeiconsIcon
                    icon={Tick02Icon}
                    strokeWidth={2}
                    className="size-4 text-[var(--palette-teal-700)]"
                />
              </FrostPillMark>
              <p className="min-w-0 text-sm leading-[1.5]">{t(commitment)}</p>
            </FrostPill>
          ))}
        </ul>
      </Surface>
    </HomeSection>
  );
}
