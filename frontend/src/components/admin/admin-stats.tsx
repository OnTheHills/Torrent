"use client";

import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon,
  ArrowRight01Icon,
  BadgePercentIcon,
  File01Icon,
  HeartIcon,
} from "@hugeicons/core-free-icons";

import { formatWhen } from "@/components/admin/admin-ui";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

type SourceHealth = {
  verdict: string;
  lastRun: { finishedAt?: string } | null;
};

const PINK_SCENE =
  "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,#f9c2d8_72%,var(--palette-gray-100)),color-mix(in_srgb,#e44586_46%,var(--palette-gray-150))_52%,color-mix(in_srgb,#c73670_38%,var(--palette-gray-200)))]";

const RED_SCENE =
  "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-red-300)_72%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-red-400)_58%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-red-600)_44%,var(--palette-gray-200)))]";

function lastChecked(sources: SourceHealth[]) {
  const latest = sources
    .map((source) => source.lastRun?.finishedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const when = formatWhen(latest);
  return when === "—" ? "No sync recorded" : `Last checked ${when}`;
}

export function AdminStats({
  tracked,
  hidden,
  queue,
  sources,
  accuracy,
}: {
  tracked: number;
  hidden: number;
  queue: number;
  sources: SourceHealth[];
  accuracy: {
    sampleSize: number;
    accuracy: number | null;
    checked: number;
    corrections: number;
  };
}) {
  const failing = sources.filter((source) => source.verdict === "red").length;
  const healthy = failing === 0 && sources.length > 0;

  const cards: {
    key: string;
    label: string;
    value: string;
    hint: string;
    icon: IconSvgElement;
    iconFg: string;
    fillIcon?: boolean | "body" | "first";
    linkHref?: string;
    linkLabel?: string;
    scene: string;
    valueClass?: string;
  }[] = [
    {
      key: "health",
      label: "Source health",
      value: healthy
        ? "All sources healthy"
        : failing === 1
          ? "1 source failing"
          : `${failing} sources failing`,
      hint: lastChecked(sources),
      icon: HeartIcon,
      iconFg: healthy ? "text-[#9b2d5c]" : "text-[var(--palette-red-800)]",
      fillIcon: true,
      linkHref: routes.admin.sources,
      linkLabel: "Sources",
      scene: healthy ? PINK_SCENE : RED_SCENE,
      valueClass: "text-2xl md:text-[1.75rem] md:leading-tight",
    },
    {
      key: "tracked",
      label: "TORs tracked",
      value: String(tracked),
      hint:
        hidden > 0
          ? `Public catalog. ${hidden} hidden from listings.`
          : "Records in the public catalog.",
      icon: File01Icon,
      iconFg: "text-[var(--palette-teal-800)]",
      fillIcon: "body",
      linkHref: routes.admin.tors,
      linkLabel: "Records",
      scene:
        "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-teal-300)_55%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-teal-400)_48%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-teal-600)_42%,var(--palette-gray-200)))]",
    },
    {
      key: "accuracy",
      label: "Extraction accuracy",
      value: accuracy.sampleSize ? `${accuracy.accuracy}%` : "—",
      hint: accuracy.sampleSize
        ? `${accuracy.sampleSize} ${
            accuracy.sampleSize === 1 ? "review" : "reviews"
          } · ${accuracy.checked} fields checked · ${accuracy.corrections} corrected`
        : "Share of extracted fields that a reviewer left unchanged.",
      icon: BadgePercentIcon,
      iconFg: "text-[var(--palette-blue-800)]",
      fillIcon: "first",
      scene:
        "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-blue-200)_62%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-blue-300)_48%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-blue-500)_36%,var(--palette-gray-200)))]",
    },
    {
      key: "queue",
      label: "Low confidence",
      value: String(queue),
      hint: "Glance and Review records that still need a look.",
      icon: Alert02Icon,
      iconFg: "text-[var(--palette-yellow-800)]",
      fillIcon: "first",
      linkHref: routes.admin.review,
      linkLabel: "Review",
      scene:
        "bg-[radial-gradient(125%_95%_at_18%_8%,color-mix(in_srgb,var(--palette-yellow-200)_62%,var(--palette-gray-100)),color-mix(in_srgb,var(--palette-yellow-300)_48%,var(--palette-gray-150))_52%,color-mix(in_srgb,var(--palette-yellow-400)_36%,var(--palette-gray-200)))]",
    },
  ];

  return (
    <ul className="-mt-4 grid grid-cols-2 gap-3 sm:-mt-6 sm:gap-4 md:-mt-8">
      {cards.map((card) => (
        <li key={card.key} className="relative">
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
                className={cn(
                  "size-5 shrink-0",
                  card.iconFg,
                  card.fillIcon === "body" &&
                    "[&_path:last-of-type]:fill-current [&_path:not(:last-of-type)]:opacity-0",
                  card.fillIcon === "first" &&
                    "[&_path:first-of-type]:fill-current [&_path:not(:first-of-type)]:fill-white [&_path:not(:first-of-type)]:stroke-white",
                  card.fillIcon === true && "[&_path]:fill-current",
                )}
              />
              <h3 className="liquid-glass-ink text-xl font-semibold tracking-tight">
                {card.label}
              </h3>
              {card.linkHref ? (
                <Link
                  href={card.linkHref}
                  className={cn(
                    "ml-auto inline-flex shrink-0 items-center gap-1.5 text-sm font-medium",
                    card.iconFg,
                  )}
                >
                  {card.linkLabel}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                </Link>
              ) : null}
            </div>
            <div className="mt-auto text-left">
              <p
                className={cn(
                  "liquid-glass-ink font-semibold tracking-tight",
                  card.valueClass ?? "text-3xl tabular-nums",
                )}
              >
                {card.value}
              </p>
              <p className="liquid-glass-muted text-sm leading-[1.7]">
                {card.hint}
              </p>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
