"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

/** Score as a compact metric — not a competitor-style colored pill. */
export function MatchBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const { t } = useLocale();

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 font-heading text-sm font-semibold tabular-nums text-foreground",
        className
      )}
    >
      <span>{score}%</span>
      <span className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {t("match")}
      </span>
    </span>
  );
}
