"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon,
  Analytics01Icon,
  Layers01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { HomeSection } from "@/components/home/home-section";
import { useLocale } from "@/components/providers/locale-provider";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const CAPABILITIES: {
  title: DictionaryKey;
  body: DictionaryKey;
  icon: IconSvgElement;
}[] = [
  { title: "capDiscoveryTitle", body: "capDiscoveryBody", icon: Search01Icon },
  { title: "capLifecycleTitle", body: "capLifecycleBody", icon: Layers01Icon },
  { title: "capBudgetTitle", body: "capBudgetBody", icon: Analytics01Icon },
  { title: "capIntegrityTitle", body: "capIntegrityBody", icon: Alert02Icon },
];

export function HomeCapabilities() {
  const { t } = useLocale();

  return (
    <HomeSection
      eyebrow={t("capabilitiesEyebrow")}
      title={t("capabilitiesTitle")}
      description={t("capabilitiesBody")}
    >
      <ul className="grid gap-4 md:grid-cols-2">
        {CAPABILITIES.map((capability) => (
          <li
            key={capability.title}
            className="flex gap-4 rounded-[8px] bg-card p-6 ring-1 ring-foreground/10"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--palette-orange-100)]">
              <HugeiconsIcon
                icon={capability.icon}
                strokeWidth={1.75}
                className="size-5 text-[var(--palette-orange-700)]"
              />
            </span>
            <div className="space-y-2">
              <h3 className="text-base font-semibold tracking-tight">
                {t(capability.title)}
              </h3>
              <p className="text-sm leading-[1.7] text-muted-foreground">
                {t(capability.body)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
