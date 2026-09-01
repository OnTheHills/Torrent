"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

import { HomeSection } from "@/components/home/home-section";
import { useLocale } from "@/components/providers/locale-provider";
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
      <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2">
        {COMMITMENTS.map((commitment) => (
          <li
            key={commitment}
            className="flex items-start gap-3 border-t border-border pt-4 text-sm leading-[1.7]"
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              strokeWidth={1.75}
              className="mt-0.5 size-4 shrink-0 text-accent"
            />
            {t(commitment)}
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
