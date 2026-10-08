"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  AlarmClockIcon,
  Award01Icon,
  CancelCircleIcon,
  FileEditIcon,
  LiveStreaming02Icon,
  SquareLock02Icon,
} from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { listingStage, type ListingStage } from "@/lib/listing-stage";
import { cn } from "@/lib/utils";

const CATEGORY_COLOR: Record<string, string> = {
  "Software Development":
    "bg-[var(--palette-purple-100)] text-[var(--palette-purple-800)]",
  "Web Application":
    "bg-[var(--palette-blue-100)] text-[var(--palette-blue-800)]",
  "Mobile Application": "bg-[#d4effb] text-[#0b5c7d]",
  "Data Platform":
    "bg-[var(--palette-teal-100)] text-[var(--palette-teal-800)]",
  "Digital Platform":
    "bg-[var(--palette-green-75)] text-[var(--palette-green-800)]",
  "AI / Analytics":
    "bg-[var(--palette-orange-100)] text-[var(--palette-orange-800)]",
  Cybersecurity: "bg-[var(--palette-red-100)] text-[var(--palette-red-800)]",
  GIS: "bg-[var(--palette-yellow-100)] text-[var(--palette-yellow-800)]",
  Others: "bg-[color-mix(in_srgb,#f7b6cf_60%,white)] text-[#b02d66]",
};

const STAGE_BADGE: Record<
  ListingStage,
  { label: DictionaryKey; icon: IconSvgElement; className: string }
> = {
  open: {
    label: "cardStageOpen",
    icon: LiveStreaming02Icon,
    className: "text-[var(--palette-green-800)]",
  },
  closing: {
    label: "cardStageClosing",
    icon: AlarmClockIcon,
    className: "text-[var(--palette-yellow-800)]",
  },
  draft: {
    label: "cardStageDraft",
    icon: FileEditIcon,
    className: "text-[var(--palette-gray-700)]",
  },
  closed: {
    label: "cardStageClosed",
    icon: SquareLock02Icon,
    className: "text-[var(--palette-red-700)]",
  },
  awarded: {
    label: "cardStageAwarded",
    icon: Award01Icon,
    className: "text-[var(--palette-red-700)]",
  },
  cancelled: {
    label: "cardStageCancelled",
    icon: CancelCircleIcon,
    className: "text-[var(--palette-red-700)]",
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
}: {
  category: string;
  size?: keyof typeof BADGE_SIZE;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center rounded-full font-medium",
        BADGE_SIZE[size].pill,
        CATEGORY_COLOR[category] ??
          "bg-[var(--palette-gray-150)] text-[var(--palette-gray-700)]",
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
