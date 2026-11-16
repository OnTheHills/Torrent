"use client";

import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  File01Icon,
  MoneyBag02Icon,
} from "@hugeicons/core-free-icons";

import { MonitorSection } from "@/components/monitor/monitor-section";
import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { routes } from "@/config/routes";
import { formatBudgetCompact, formatDate } from "@/data/mock";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

const CARDS: {
  id: "medianBudget" | "advertisedTotal" | "publishedCount";
  title: DictionaryKey;
  hint: DictionaryKey;
  icon: IconSvgElement;
  iconFg: string;
  scene: string;
  money?: boolean;
  linkListings?: boolean;
}[] = [
  {
    id: "medianBudget",
    title: "kpiMedianBudget",
    hint: "kpiMedianBudgetHint",
    icon: File01Icon,
    iconFg: "text-[var(--palette-teal-800)]",
    money: true,
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-teal-300)_55%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-teal-400)_48%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-teal-600)_42%,var(--palette-gray-200)))]",
  },
  {
    id: "advertisedTotal",
    title: "kpiAdvertisedTotal",
    hint: "kpiAdvertisedTotalHint",
    icon: MoneyBag02Icon,
    iconFg: "text-[var(--palette-blue-800)]",
    money: true,
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-blue-200)_62%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-blue-300)_48%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-blue-500)_36%,var(--palette-gray-200)))]",
  },
  {
    id: "publishedCount",
    title: "statPublished",
    hint: "statPublishedCountFrom",
    icon: CheckmarkCircle02Icon,
    iconFg: "text-[var(--palette-orange-800)]",
    linkListings: true,
    scene:
      "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-orange-300)_68%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-orange-400)_56%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-orange-500)_44%,var(--palette-gray-200)))]",
  },
];

export function BudgetKpiStrip({
  values,
  isPending,
}: {
  values: {
    medianBudget: number;
    advertisedTotal: number;
    publishedCount: number;
    publishedSince: string;
  };
  isPending?: boolean;
}) {
  const { t, locale } = useLocale();
  const listings =
    useAudience() === "vendor" ? routes.app.tors : routes.tors;

  return (
    <MonitorSection
      bare
      title={t("budgetSnapshotTitle")}
      description={t("budgetSnapshotSubtitle")}
    >
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {CARDS.map((card) => {
          const amount = values[card.id];
          const publishedHint = values.publishedSince
            ? `${t("statPublishedCountFrom")}${t("statPublishedSince")} ${formatDate(values.publishedSince, locale)}`
            : t("statPublishedCountFrom");

          return (
            <li key={card.id} className="relative">
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-2xl",
                  card.scene,
                )}
              />
              <article className="liquid-glass-card liquid-glass-card-static relative flex h-full flex-col gap-4 rounded-2xl p-5 md:p-6">
                <div className="flex items-center gap-2.5">
                  <HugeiconsIcon
                    icon={card.icon}
                    strokeWidth={2}
                    className={cn("size-5 shrink-0", card.iconFg)}
                  />
                  <h3 className="liquid-glass-ink text-xl font-semibold tracking-tight">
                    {t(card.title)}
                  </h3>
                  {card.linkListings ? (
                    <Link
                      href={listings}
                      className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--palette-orange-800)]"
                    >
                      {t("navListings")}
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        strokeWidth={2}
                        className="size-3.5"
                      />
                    </Link>
                  ) : null}
                </div>
                <div className="mt-auto text-left">
                  {isPending ? (
                    <span className="block h-9 w-28 animate-pulse rounded-md bg-[color-mix(in_srgb,var(--palette-gray-400)_32%,transparent)] motion-reduce:animate-none" />
                  ) : (
                    <p className="liquid-glass-ink text-3xl font-semibold tracking-tight tabular-nums">
                      {card.money ? formatBudgetCompact(amount, locale) : amount}
                    </p>
                  )}
                  <p className="liquid-glass-muted text-sm leading-[1.7]">
                    {card.id === "publishedCount"
                      ? publishedHint
                      : t(card.hint)}
                  </p>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </MonitorSection>
  );
}
