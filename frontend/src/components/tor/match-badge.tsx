"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

/** Score as a compact metric — not a competitor-style colored pill. */
export function MatchBadge({
  score,
  className,
  inline = false,
}: {
  score: number;
  className?: string;
  /** Single-line "Strong fit 91%" at the date-label size. */
  inline?: boolean;
}) {
  const { t } = useLocale();
  const tier = score >= 85 ? "fitStrong" : score >= 70 ? "fitGood" : "fitPossible";

  if (inline) {
    return (
      <span
        className={cn(
          "inline-flex items-center whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground",
          className,
        )}
      >
        {`${t(tier)} ${t("match")} ${score}%`}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 font-heading text-sm font-semibold tabular-nums text-foreground",
        className
      )}
    >
      <span className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {t(tier)}
      </span>
      <span>{score}%</span>
      <span className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {t("match")}
      </span>
    </span>
  );
}
