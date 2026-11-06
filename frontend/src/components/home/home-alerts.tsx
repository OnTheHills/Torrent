"use client";

import Link from "next/link";
import { AiMail02Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

import { HomeSection } from "@/components/home/home-section";
import { useLocale } from "@/components/providers/locale-provider";
import { chromeFrostGlaze } from "@/components/ui/appbar";
import { routes } from "@/config/routes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

/**
 * Official LINE Brand icon from https://line.me/en/logo (PNG, unmodified).
 * Guidelines: full-color as-is, no recolor / effects; min height 20px PC / 40px mobile.
 */
function LineBrandIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- official raster brand asset
    <img
      src="/brand/line.png"
      alt=""
      aria-hidden
      width={1001}
      height={1000}
      className={className}
      draggable={false}
    />
  );
}

const titleChip =
  "inline-flex w-fit max-w-full items-center gap-2 self-start rounded-md bg-[color-mix(in_srgb,var(--palette-white)_72%,transparent)] px-3 py-2.5 text-xl font-semibold tracking-tight text-[color:var(--liquid-glass-ink)] shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.7)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_45%,transparent)] backdrop-blur-[2px] md:text-2xl";

const stepChip =
  "flex w-full items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--palette-white)_72%,transparent)] py-1.5 pl-3.5 pr-3.5 text-sm leading-snug text-[color:var(--liquid-glass-ink-secondary)] shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.65)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_40%,transparent)] backdrop-blur-[2px]";

const CHANNELS: {
  title: DictionaryKey;
  body: DictionaryKey;
  steps: [DictionaryKey, DictionaryKey, DictionaryKey];
  icon: ReactNode;
  scene: string;
  cta: DictionaryKey;
  href: string;
}[] = [
  {
    title: "alertsSmartTitle",
    body: "alertsSmartBody",
    steps: ["alertsSmartStep1", "alertsSmartStep2", "alertsSmartStep3"],
    icon: (
      <HugeiconsIcon
        icon={AiMail02Icon}
        strokeWidth={2}
        className="size-full text-[var(--palette-navy-700)]"
      />
    ),
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-blue-600)_28%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-blue-600)_36%,var(--palette-gray-150))_50%,color-mix(in_srgb,var(--palette-blue-700)_40%,var(--palette-gray-200)))]",
    cta: "alertsCta",
    href: routes.login,
  },
  {
    title: "alertsLineTitle",
    body: "alertsLineBody",
    steps: ["alertsLineStep1", "alertsLineStep2", "alertsLineStep3"],
    icon: <LineBrandIcon className="size-full" />,
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-green-600)_28%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-green-600)_36%,var(--palette-gray-150))_50%,color-mix(in_srgb,var(--palette-green-700)_40%,var(--palette-gray-200)))]",
    cta: "alertsLineCta",
    href: routes.login,
  },
];

export function HomeAlerts() {
  const { t } = useLocale();

  return (
    <HomeSection title={t("alertsTitle")} description={t("alertsSubtitle")}>
      <ul className="flex flex-col gap-4">
        {CHANNELS.map((channel) => (
          <li key={channel.title} className="relative w-full">
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 rounded-2xl",
                channel.scene,
              )}
            />
            <article
              className={cn(
                "liquid-glass-card relative flex w-full flex-col rounded-2xl p-5 md:p-6",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className={titleChip}>
                  <span className="inline-flex size-[1em] shrink-0 items-center justify-center overflow-hidden">
                    {channel.icon}
                  </span>
                  <h3 className="liquid-glass-ink min-w-0 truncate leading-none">
                    {t(channel.title)}
                  </h3>
                </div>
                <Link
                  href={channel.href}
                  className={cn(
                    chromeFrostGlaze,
                    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium",
                    "transition-[transform,background] duration-200 ease-out",
                    "hover:-translate-y-0.5",
                    "motion-reduce:transition-none motion-reduce:hover:transform-none",
                  )}
                >
                  {t(channel.cta)}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                </Link>
              </div>

              <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start md:gap-8">
                <p className="liquid-glass-muted text-sm leading-[1.65] md:text-base">
                  {t(channel.body)}
                </p>
                <ol className="flex flex-col gap-2">
                  {channel.steps.map((step, index) => (
                    <li key={step}>
                      <span className={stepChip}>
                        <span className="liquid-glass-ink shrink-0 font-bold tabular-nums">
                          {index + 1}.
                        </span>
                        <span className="min-w-0 font-medium">{t(step)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
