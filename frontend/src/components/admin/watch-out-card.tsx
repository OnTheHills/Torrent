"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { FrostCard } from "@/components/ui/frost-card";
import { cn } from "@/lib/utils";

const FLAG_LABELS: Record<string, string> = {
  "short-window": "Bidding window under 3 days",
  "deadline-before-publish": "Deadline is before the announcement",
  "awarded-without-budget": "Awarded with no budget",
  "budget-high": "Budget is more than 3× the category median",
  "budget-low": "Budget is under a quarter of the category median",
  other: "Other procurement signal",
};

export type WatchOutData = {
  integrityStatus?: string | null;
  integrityFlags?: string[];
  integrityReason?: string | null;
  integrityNote?: string | null;
};

export function hasWatchOut(data?: WatchOutData | null) {
  if (!data) return false;
  const status = data.integrityStatus || "clear";
  if (status === "flagged" || status === "confirmed") return true;
  return Boolean(data.integrityFlags?.length);
}

function flagLabel(flag: string) {
  return FLAG_LABELS[flag] || flag;
}

export function WatchOutCard({
  data,
  className,
}: {
  data: WatchOutData;
  className?: string;
}) {
  if (!hasWatchOut(data)) return null;

  const flags = data.integrityFlags?.length
    ? data.integrityFlags
    : data.integrityReason
      ? [data.integrityReason]
      : [];
  const summary =
    data.integrityNote?.trim() ||
    flags.map(flagLabel).join(" · ") ||
    "This listing has procurement signals worth a closer look.";

  return (
    <FrostCard
      className={cn(
        "rounded-lg border-0 bg-[color-mix(in_srgb,var(--palette-orange-100)_55%,transparent)] p-5 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-orange-300)_45%,transparent)] md:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--palette-orange-300)_35%,transparent)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] ring-1 ring-[color-mix(in_srgb,var(--palette-orange-400)_40%,transparent)]">
          <HugeiconsIcon
            icon={Alert02Icon}
            strokeWidth={2}
            className="size-4 text-[var(--palette-orange-800)]"
          />
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--palette-orange-900)]">
          Watch out
        </h2>
      </div>
      <p className="mt-3 text-sm leading-[1.7] text-foreground md:text-base">{summary}</p>
      {flags.length ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {flags.map((flag) => (
            <li
              key={flag}
              className="inline-flex h-7 items-center rounded-full bg-[color-mix(in_srgb,white_72%,transparent)] px-2.5 text-xs font-medium text-foreground ring-1 ring-[color-mix(in_srgb,var(--palette-orange-300)_40%,transparent)]"
            >
              {flagLabel(flag)}
            </li>
          ))}
        </ul>
      ) : null}
    </FrostCard>
  );
}
