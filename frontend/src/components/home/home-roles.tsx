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
import { chromeFrostGlaze } from "@/components/ui/appbar";
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
  "bg-[color-mix(in_srgb,var(--palette-white)_72%,transparent)] text-[color:var(--liquid-glass-ink)] ring-[color-mix(in_srgb,var(--palette-gray-300)_45%,transparent)] shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.7)] backdrop-blur-[2px]";

/**
 * Chromatic scene under each glass card — glass must sit over color, not flat paper.
 */
const toneStyles = {
  teal: {
    scene:
      "bg-[radial-gradient(120%_90%_at_20%_10%,var(--palette-teal-150),var(--palette-teal-300)_55%,var(--palette-teal-500))]",
    featureIcon: "text-[var(--palette-teal-800)]",
    place:
      "self-start justify-self-start origin-bottom -rotate-[6deg] md:translate-x-[2%]",
  },
  orange: {
    scene:
      "bg-[radial-gradient(120%_90%_at_20%_10%,var(--palette-orange-150),var(--palette-orange-300)_55%,var(--palette-orange-500))]",
    featureIcon: "text-[var(--palette-orange-800)]",
    place:
      "self-start justify-self-end origin-bottom rotate-[6deg] md:translate-x-[-2%]",
  },
} as const;

export function HomeRoles() {
  const { t } = useLocale();
  const [front, setFront] = useState<RoleTone>("orange");
  const [shake, setShake] = useState<{ tone: RoleTone; tick: number } | null>(
    null,
  );

  const bringFront = (tone: RoleTone) => {
    setFront(tone);
    setShake((prev) => ({ tone, tick: (prev?.tick ?? 0) + 1 }));
  };

  return (
    <HomeSection title={t("rolesTitle")} description={t("rolesSubtitle")}>
      {/* Extra pad keeps rotated card bottoms inside this band so neighbors can't cover CTAs. */}
      <div className="relative isolate mx-auto grid w-full max-w-4xl px-2 pb-14 pt-8 md:px-4 md:pb-20 md:pt-10">
        {ROLES.map((role) => {
          const tone = toneStyles[role.tone];
          const isFront = front === role.tone;
          const isShaking = shake?.tone === role.tone;
          return (
            <div
              key={role.title}
              className={cn(
                "relative col-start-1 row-start-1 h-fit w-[min(100%,22.5rem)] transition-transform duration-300 ease-out md:w-[58%] md:max-w-[28rem]",
                "motion-reduce:transition-none",
                tone.place,
                isFront ? "z-20 scale-[1.02]" : "z-10 scale-100",
              )}
            >
              {/* Scene the glass samples — same radii as the card. */}
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-2xl",
                  tone.scene,
                )}
              />
              <article
                role="button"
                tabIndex={0}
                aria-pressed={isFront}
                onClick={() => bringFront(role.tone)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    bringFront(role.tone);
                  }
                }}
                className={cn(
                  "liquid-glass-card relative h-fit cursor-pointer rounded-2xl p-6 md:p-7",
                  "transition-[transform,background] duration-300 ease-out",
                  "motion-reduce:transition-none",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-full ring-1",
                      iconFrame,
                    )}
                  >
                    <HugeiconsIcon
                      icon={role.icon}
                      strokeWidth={2}
                      className="size-5"
                    />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="liquid-glass-muted text-sm leading-snug">
                      {t(role.eyebrow)}
                    </p>
                    <h3 className="liquid-glass-ink text-xl font-semibold tracking-tight">
                      {t(role.title)}
                    </h3>
                  </div>
                </div>

                {t(role.body) ? (
                  <p className="liquid-glass-muted mt-4 text-sm leading-[1.7]">
                    {t(role.body)}
                  </p>
                ) : null}

                <ul className="mt-5 space-y-3">
                  {role.features.map((feature, index) => (
                    <li
                      key={feature.label}
                      className="liquid-glass-muted flex items-start gap-2.5 text-sm leading-snug"
                    >
                      <span
                        key={
                          isShaking
                            ? `${shake.tick}-${feature.label}`
                            : feature.label
                        }
                        className={cn(
                          "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center",
                          tone.featureIcon,
                          isShaking &&
                            "motion-safe:animate-[role-feature-shake_420ms_ease-in-out_both]",
                        )}
                        style={
                          isShaking
                            ? { animationDelay: `${index * 55}ms` }
                            : undefined
                        }
                      >
                        <HugeiconsIcon
                          icon={feature.icon}
                          strokeWidth={2}
                          className="size-4"
                        />
                      </span>
                      <span>
                        <span className="liquid-glass-ink font-semibold">
                          {t(feature.name)}:
                        </span>{" "}
                        {t(feature.label)}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={role.href}
                  onClick={(event) => event.stopPropagation()}
                  className={cn(
                    chromeFrostGlaze,
                    "mt-6 inline-flex h-10 w-fit items-center gap-1.5 rounded-full px-4 text-sm font-medium",
                    "transition-[transform,background] duration-200 ease-out",
                    "hover:-translate-y-0.5",
                    "motion-reduce:transition-none motion-reduce:hover:transform-none",
                  )}
                >
                  {t(role.cta)}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                </Link>
              </article>
            </div>
          );
        })}
      </div>
    </HomeSection>
  );
}
