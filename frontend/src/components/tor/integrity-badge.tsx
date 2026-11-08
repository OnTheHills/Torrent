"use client";

import { Alert02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import type { IntegrityStatus } from "@/types/tor";

const BADGE_SIZE = {
  sm: { pill: "h-6 gap-1 px-2.5 text-xs", icon: "size-4" },
  lg: { pill: "h-8 gap-1.5 px-3.5 text-sm", icon: "size-5" },
} as const;

/** Flat yellow flag pin for card corners. */
export function IntegrityFlagPin({
  className,
}: {
  className?: string;
}) {
  const { t } = useLocale();

  return (
    <span
      role="img"
      aria-label={t("watchOutFlagged")}
      title={t("watchOutFlagged")}
      className={cn(
        "pointer-events-none absolute -right-2 -top-2 z-20 inline-flex size-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--palette-yellow-300)_72%,white)] text-[var(--palette-yellow-900)]",
        className,
      )}
    >
      <HugeiconsIcon icon={Alert02Icon} strokeWidth={2.25} className="size-5" />
    </span>
  );
}

export function IntegrityBadge({
  status,
  size = "sm",
  className,
}: {
  status: IntegrityStatus;
  size?: keyof typeof BADGE_SIZE;
  className?: string;
}) {
  const { t } = useLocale();
  const flagged = status === "suspicious";

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full font-medium",
        BADGE_SIZE[size].pill,
        flagged
          ? "bg-[color-mix(in_srgb,var(--palette-yellow-300)_72%,white)] text-[var(--palette-yellow-900)]"
          : "bg-[color-mix(in_srgb,var(--palette-gray-200)_55%,white)] text-[var(--palette-gray-700)]",
        className,
      )}
    >
      <HugeiconsIcon
        icon={flagged ? Alert02Icon : Tick02Icon}
        strokeWidth={2}
        className={BADGE_SIZE[size].icon}
      />
      {flagged ? t("watchOutFlagged") : t("watchOutClear")}
    </span>
  );
}
