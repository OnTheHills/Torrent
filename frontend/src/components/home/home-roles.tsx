"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Briefcase01Icon,
  File01Icon,
  GlobeIcon,
  HeartIcon,
  Message01Icon,
  MoneyBag02Icon,
  Notification03Icon,
  Pulse01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

import { HomeSection } from "@/components/home/home-section";
import { useLocale } from "@/components/providers/locale-provider";
import { routes } from "@/config/routes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

type RoleTone = "teal" | "orange";

type RoleFeature = {
  name: DictionaryKey;
  label: DictionaryKey;
  icon: IconSvgElement;
};

const ROLES: {
  title: DictionaryKey;
  eyebrow: DictionaryKey;
  body: DictionaryKey;
  features: RoleFeature[];
  cta: DictionaryKey;
  href: string;
  icon: IconSvgElement;
  tone: RoleTone;
}[] = [
  {
    title: "rolePublicTitle",
    eyebrow: "rolePublicEyebrow",
    body: "rolePublicBody",
    features: [
      { name: "navListings", label: "rolePublicFeature1", icon: File01Icon },
      { name: "navMonitor", label: "rolePublicFeature2", icon: Pulse01Icon },
      { name: "navBudgets", label: "rolePublicFeature3", icon: MoneyBag02Icon },
    ],
    cta: "browseTors",
    href: routes.tors,
    icon: GlobeIcon,
    tone: "teal",
  },
  {
    title: "roleVendorTitle",
    eyebrow: "roleVendorEyebrow",
    body: "roleVendorBody",
    features: [
      { name: "navInbox", label: "roleVendorFeature1", icon: SparklesIcon },
      { name: "navWatchlist", label: "roleVendorFeature2", icon: HeartIcon },
      {
        name: "navAlerts",
        label: "roleVendorFeature3",
        icon: Notification03Icon,
      },
      {
        name: "roleVendorLineTitle",
        label: "roleVendorFeature4",
        icon: Message01Icon,
      },
    ],
    cta: "vendorSignIn",
    href: routes.login,
    icon: Briefcase01Icon,
    tone: "orange",
  },
];

const iconFrame =
  "bg-white text-foreground ring-[color-mix(in_srgb,var(--palette-gray-300)_65%,transparent)]";

const toneStyles = {
  teal: {
    card: "bg-[color-mix(in_srgb,var(--palette-teal-300)_42%,transparent)] ring-[color-mix(in_srgb,var(--palette-teal-400)_50%,transparent)]",
    featureIcon: "text-[var(--palette-teal-700)]",
    cta: "bg-[color-mix(in_srgb,var(--palette-teal-500)_38%,transparent)] text-[var(--palette-teal-900)] ring-[color-mix(in_srgb,var(--palette-teal-600)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--palette-teal-500)_48%,transparent)]",
    place: "justify-self-start origin-center -rotate-[7deg] md:translate-x-[2%]",
  },
  orange: {
    card: "bg-[color-mix(in_srgb,var(--palette-orange-300)_46%,transparent)] ring-[color-mix(in_srgb,var(--palette-orange-400)_52%,transparent)]",
    featureIcon: "text-[var(--palette-orange-700)]",
    cta: "bg-[color-mix(in_srgb,var(--palette-orange-500)_38%,transparent)] text-[var(--palette-orange-900)] ring-[color-mix(in_srgb,var(--palette-orange-600)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--palette-orange-500)_48%,transparent)]",
    place: "justify-self-end origin-center rotate-[7deg] md:translate-x-[-2%]",
  },
} as const;

export function HomeRoles() {
  const { t } = useLocale();
  const [front, setFront] = useState<RoleTone>("orange");

  return (
    <HomeSection title={t("rolesTitle")} description={t("rolesSubtitle")}>
      <div className="relative mx-auto grid w-full max-w-4xl py-4 md:py-6">
        {ROLES.map((role) => {
          const tone = toneStyles[role.tone];
          const isFront = front === role.tone;
          return (
            <article
              key={role.title}
              role="button"
              tabIndex={0}
              aria-pressed={isFront}
              onClick={() => setFront(role.tone)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setFront(role.tone);
                }
              }}
              className={cn(
                "col-start-1 row-start-1 w-[min(100%,22.5rem)] cursor-pointer rounded-2xl p-6 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_85%,transparent),0_18px_40px_rgb(0_0_0_/_0.08)] ring-1 backdrop-blur-xl backdrop-saturate-150 transition-[transform,box-shadow] duration-300 ease-out md:w-[58%] md:max-w-[28rem] md:p-7",
                "motion-reduce:transition-none",
                tone.card,
                tone.place,
                isFront ? "z-20 scale-[1.02]" : "z-10 scale-100",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-full ring-1",
                    iconFrame,
                  )}
                >
                  <HugeiconsIcon icon={role.icon} strokeWidth={2} className="size-5" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm leading-snug text-muted-foreground">
                    {t(role.eyebrow)}
                  </p>
                  <h3 className="text-xl font-semibold tracking-tight">{t(role.title)}</h3>
                </div>
              </div>

              {t(role.body) ? (
                <p className="mt-4 text-base leading-[1.7] text-muted-foreground">
                  {t(role.body)}
                </p>
              ) : null}

              <ul className="mt-5 space-y-3">
                {role.features.map((feature) => (
                  <li key={feature.label} className="flex items-start gap-2.5 text-sm leading-snug">
                    <HugeiconsIcon
                      icon={feature.icon}
                      strokeWidth={2}
                      className={cn("mt-0.5 size-4 shrink-0", tone.featureIcon)}
                    />
                    <span>
                      <span className="font-semibold text-foreground">{t(feature.name)}:</span>{" "}
                      {t(feature.label)}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={role.href}
                onClick={(event) => event.stopPropagation()}
                className={cn(
                  "mt-6 inline-flex h-10 w-fit items-center gap-1.5 rounded-full px-4 text-sm font-medium",
                  "shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-1",
                  "backdrop-blur-md transition-[transform,background-color] duration-200 ease-out",
                  "hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:transform-none",
                  tone.cta,
                )}
              >
                {t(role.cta)}
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
              </Link>
            </article>
          );
        })}
      </div>
    </HomeSection>
  );
}
