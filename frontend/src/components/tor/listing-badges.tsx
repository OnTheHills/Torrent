"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  AlarmClockIcon,
  Award01Icon,
  CancelCircleIcon,
  FileEditIcon,
  LiveStreaming02Icon,
  SquareLock02Icon,
  CancelIcon,
} from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { listingStage, type ListingStage } from "@/lib/listing-stage";
import { cn } from "@/lib/utils";

const CATEGORY_TONE: Record<string, { className: string; fill: string; ink: string }> = {
  "Software Development": {
    className: "bg-[var(--palette-purple-200)] text-[var(--palette-purple-800)]",
    fill: "var(--palette-purple-200)",
    ink: "var(--palette-purple-800)",
  },
  "Web Application": {
    className: "bg-[var(--palette-navy-200)] text-[var(--palette-navy-800)]",
    fill: "var(--palette-navy-200)",
    ink: "var(--palette-navy-800)",
  },
  "Mobile Application": {
    className: "bg-[var(--palette-blue-200)] text-[var(--palette-blue-800)]",
    fill: "var(--palette-blue-200)",
    ink: "var(--palette-blue-800)",
  },
  "Data Platform": {
    className: "bg-[var(--palette-teal-200)] text-[var(--palette-teal-800)]",
    fill: "var(--palette-teal-200)",
    ink: "var(--palette-teal-800)",
  },
  "Digital Platform": {
    className: "bg-[var(--palette-green-250)] text-[var(--palette-green-800)]",
    fill: "var(--palette-green-250)",
    ink: "var(--palette-green-800)",
  },
  "AI / Analytics": {
    className: "bg-[var(--palette-orange-250)] text-[var(--palette-orange-800)]",
    fill: "var(--palette-orange-250)",
    ink: "var(--palette-orange-800)",
  },
  Cybersecurity: {
    className: "bg-[var(--palette-red-300)] text-[var(--palette-red-800)]",
    fill: "var(--palette-red-300)",
    ink: "var(--palette-red-800)",
  },
  GIS: {
    className: "bg-[var(--palette-yellow-300)] text-[var(--palette-yellow-800)]",
    fill: "var(--palette-yellow-300)",
    ink: "var(--palette-yellow-800)",
  },
  Others: {
    className: "bg-[var(--palette-brown-250)] text-[var(--palette-brown-900)]",
    fill: "var(--palette-brown-250)",
    ink: "var(--palette-brown-900)",
  },
};

const FALLBACK_TONE = {
  className: "bg-[var(--palette-gray-150)] text-[var(--palette-gray-700)]",
  fill: "var(--palette-gray-150)",
  ink: "var(--palette-gray-700)",
};

/** Paper + grid ink for category blueprint heroes (detail page). */
const CATEGORY_BLUEPRINT: Record<string, { paper: string; grid: string }> = {
  "Software Development": {
    paper: "color-mix(in srgb, var(--palette-purple-100) 70%, white)",
    grid: "color-mix(in srgb, var(--palette-purple-400) 28%, transparent)",
  },
  "Web Application": {
    paper: "color-mix(in srgb, var(--palette-navy-100) 70%, white)",
    grid: "color-mix(in srgb, var(--palette-navy-400) 28%, transparent)",
  },
  "Mobile Application": {
    paper: "color-mix(in srgb, #d4effb 65%, white)",
    grid: "color-mix(in srgb, #0b5c7d 26%, transparent)",
  },
  "Data Platform": {
    paper: "color-mix(in srgb, var(--palette-teal-100) 70%, white)",
    grid: "color-mix(in srgb, var(--palette-teal-400) 28%, transparent)",
  },
  "Digital Platform": {
    paper: "color-mix(in srgb, var(--palette-green-250) 45%, white)",
    grid: "color-mix(in srgb, var(--palette-green-500) 28%, transparent)",
  },
  "AI / Analytics": {
    paper: "color-mix(in srgb, var(--palette-orange-250) 45%, white)",
    grid: "color-mix(in srgb, var(--palette-orange-400) 28%, transparent)",
  },
  Cybersecurity: {
    paper: "color-mix(in srgb, var(--palette-red-300) 32%, white)",
    grid: "color-mix(in srgb, var(--palette-red-400) 28%, transparent)",
  },
  GIS: {
    paper: "color-mix(in srgb, var(--palette-yellow-300) 32%, white)",
    grid: "color-mix(in srgb, var(--palette-yellow-500) 28%, transparent)",
  },
  Others: {
    paper: "color-mix(in srgb, var(--palette-brown-250) 45%, white)",
    grid: "color-mix(in srgb, var(--palette-brown-400) 30%, transparent)",
  },
};

export function categoryTone(category: string) {
  return (CATEGORY_TONE[category] ?? FALLBACK_TONE).className;
}

/** Badge fill and ink for a category, shared with the budget bars. */
export function categoryGlass(category: string) {
  const tone = CATEGORY_TONE[category] ?? FALLBACK_TONE;
  return { fill: tone.fill, ink: tone.ink };
}

export function categoryBlueprint(category?: string) {
  return (
    CATEGORY_BLUEPRINT[category ?? ""] ?? {
      paper: "var(--palette-gray-100)",
      grid: "color-mix(in srgb, var(--palette-gray-500) 34%, transparent)",
    }
  );
}

const STAGE_BADGE: Record<
  ListingStage,
  { label: DictionaryKey; icon: IconSvgElement; className: string }
> = {
  open: {
    label: "cardStageOpen",
    icon: LiveStreaming02Icon,
    className: "bg-[var(--palette-green-700)] text-white",
  },
  closing: {
    label: "cardStageClosing",
    icon: AlarmClockIcon,
    className: "bg-[var(--palette-yellow-600)] text-white",
  },
  draft: {
    label: "cardStageDraft",
    icon: FileEditIcon,
    className: "bg-[var(--palette-gray-600)] text-white",
  },
  closed: {
    label: "cardStageClosed",
    icon: SquareLock02Icon,
    className: "bg-[var(--palette-red-600)] text-white",
  },
  awarded: {
    label: "cardStageAwarded",
    icon: Award01Icon,
    className: "bg-[var(--palette-purple-700)] text-white",
  },
  cancelled: {
    label: "cardStageCancelled",
    icon: CancelIcon,
    className: "bg-[var(--palette-orange-500)] text-white",
  },
};

const BADGE_SIZE = {
  sm: { pill: "h-6 gap-1 px-2.5 text-xs", icon: "size-4" },
  lg: { pill: "h-8 gap-1.5 px-3.5 text-sm", icon: "size-5" },
} as const;

export function StageBadge({
  stage,
  size = "sm",
}: {
  stage: ListingStage;
  size?: keyof typeof BADGE_SIZE;
}) {
  const { t } = useLocale();
  const badge = STAGE_BADGE[stage];

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full bg-[color-mix(in_srgb,currentColor_16%,white)] font-medium",
        BADGE_SIZE[size].pill,
        badge.className,
      )}
    >
      <HugeiconsIcon
        icon={badge.icon}
        strokeWidth={2}
        className={BADGE_SIZE[size].icon}
      />
      {t(badge.label)}
    </span>
  );
}

export function CategoryBadge({
  category,
  size = "sm",
  className,
}: {
  category: string;
  size?: keyof typeof BADGE_SIZE;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center rounded-full font-medium",
        BADGE_SIZE[size].pill,
        categoryTone(category),
        className,
      )}
    >
      <span className="truncate">{category}</span>
    </span>
  );
}

export function ListingStatusBadges({
  tor,
  className,
  size = "sm",
}: {
  tor: { lifecycle: string; deadline?: string; category?: string };
  className?: string;
  size?: keyof typeof BADGE_SIZE;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <StageBadge stage={listingStage(tor)} size={size} />
      {tor.category ? (
        <CategoryBadge category={tor.category} size={size} />
      ) : null}
    </div>
  );
}
