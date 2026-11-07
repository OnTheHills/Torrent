"use client";

import Link from "next/link";
import {
  ArrowRight01Icon,
  File01Icon,
  MoneyBag02Icon,
  Pulse01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import { useLocale } from "@/components/providers/locale-provider";
import { routes } from "@/config/routes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

const CARDS: {
  href: string;
  title: DictionaryKey;
  body: DictionaryKey;
  icon: IconSvgElement;
}[] = [
  {
    href: routes.tors,
    title: "heroCardListingsTitle",
    body: "heroCardListingsBody",
    icon: File01Icon,
  },
  {
    href: routes.monitor,
    title: "heroCardMonitorTitle",
    body: "heroCardMonitorBody",
    icon: Pulse01Icon,
  },
  {
    href: routes.dashboard,
    title: "heroCardBudgetsTitle",
    body: "heroCardBudgetsBody",
    icon: MoneyBag02Icon,
  },
];

const frostHeroCard =
  "border-0 bg-[rgb(255_255_255_/_0.22)] text-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.7),0_8px_28px_rgb(0_0_0_/_0.05)] ring-1 ring-[rgb(255_255_255_/_0.48)] backdrop-blur-xl backdrop-saturate-150";

export function HomeHeroCards({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <ul
      className={cn(
        "grid gap-3 sm:grid-cols-3 sm:gap-4",
        className,
      )}
    >
      {CARDS.map((card) => (
        <li key={card.href}>
          <Link
            href={card.href}
            className={cn(
              frostHeroCard,
              "group flex h-full flex-col rounded-2xl p-5 transition-[transform,background-color,box-shadow] duration-200 ease-out",
              "hover:-translate-y-0.5 hover:bg-[rgb(255_255_255_/_0.34)] hover:shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.82),0_12px_32px_rgb(0_0_0_/_0.07)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--palette-teal-400)_55%,transparent)]",
              "motion-reduce:transition-none motion-reduce:hover:transform-none",
            )}
          >
            <div className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={card.icon}
                strokeWidth={1.75}
                className="size-5 shrink-0 text-foreground"
              />
              <h2 className="min-w-0 text-base font-semibold tracking-tight md:text-lg">
                {t(card.title)}
              </h2>
            </div>
            <p className="mt-2 flex-1 text-sm leading-[1.65] text-hero-muted">
              {t(card.body)}
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--palette-teal-800)]">
              {t("seeMore")}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
