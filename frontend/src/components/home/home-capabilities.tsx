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
import { FrostCard } from "@/components/ui/frost-card";
import { FrostPillMark } from "@/components/ui/frost-pill";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const CAPABILITIES = [
  {
    title: "capDiscoveryTitle",
    body: "capDiscoveryBody",
    icon: Search01Icon,
    iconBg: "bg-[var(--palette-yellow-75)]",
    iconFg: "text-[var(--palette-yellow-700)]",
    iconRing:
      "ring-[color-mix(in_srgb,var(--palette-yellow-400)_48%,transparent)]",
  },
  {
    title: "capLifecycleTitle",
    body: "capLifecycleBody",
    icon: Layers01Icon,
    iconBg: "bg-[var(--palette-teal-75)]",
    iconFg: "text-[var(--palette-teal-700)]",
    iconRing:
      "ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)]",
  },
  {
    title: "capBudgetTitle",
    body: "capBudgetBody",
    icon: Analytics01Icon,
    iconBg: "bg-[var(--palette-blue-75)]",
    iconFg: "text-[var(--palette-blue-800)]",
    iconRing:
      "ring-[color-mix(in_srgb,var(--palette-blue-400)_48%,transparent)]",
  },
  {
    title: "capIntegrityTitle",
    body: "capIntegrityBody",
    icon: Alert02Icon,
    iconBg: "bg-[var(--palette-red-75)]",
    iconFg: "text-[var(--palette-red-700)]",
    iconRing:
      "ring-[color-mix(in_srgb,var(--palette-red-400)_48%,transparent)]",
  },
] as const;

export function HomeCapabilities() {
  const { t } = useLocale();

  return (
    <HomeSection
      eyebrow={t("capabilitiesEyebrow")}
      title={t("capabilitiesTitle")}
      description={t("capabilitiesBody")}
    >
      <Surface className="space-y-4 bg-surface p-5 ring-transparent md:p-6">
        <ul className="grid gap-5 md:grid-cols-2">
          {CAPABILITIES.map((capability) => (
            <FrostCard as="li" key={capability.title} className="flex gap-4 p-6 rounded-lg md:p-5">
              <FrostPillMark
                className={cn(
                  "size-10",
                  capability.iconBg,
                  capability.iconRing,
                  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)]",
                )}
              >
                <HugeiconsIcon
                  icon={capability.icon}
                  strokeWidth={2}
                  className={`size-5 ${capability.iconFg}`}
                />
              </FrostPillMark>
              <div className="space-y-2">
                <h3 className="text-base font-semibold tracking-tight">
                  {t(capability.title)}
                </h3>
                <p className="text-sm leading-[1.7] text-muted-foreground">
                  {t(capability.body)}
                </p>
              </div>
            </FrostCard>
          ))}
        </ul>
      </Surface>
    </HomeSection>
  );
}
