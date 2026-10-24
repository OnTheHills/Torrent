"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BadgePercentIcon,
  ExpandIcon,
  GuestHouseIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

import { StageBadge } from "@/components/tor/listing-badges";
import { Badge } from "@/components/ui/badge";
import { FrostCard } from "@/components/ui/frost-card";
import { routes } from "@/config/routes";
import { listingStage } from "@/lib/listing-stage";
import { cn } from "@/lib/utils";

export type ReviewCardItem = {
  id: string;
  title: string;
  source?: string;
  department?: string;
  category?: string;
  status?: string;
  budgetThb: number;
  publishedAt?: string;
  deadline?: string;
  confidence: number;
  reviewStatus: string;
  reviewMissing: string[];
  reviewScoreReason?: string;
  reviewScoreSource?: string | null;
};

const RAINBOW_GLOW = [
  "radial-gradient(ellipse 46% 64% at 6% 28%, var(--palette-orange-300), transparent)",
  "radial-gradient(ellipse 40% 52% at 30% 6%, var(--palette-yellow-300), transparent)",
  "radial-gradient(ellipse 44% 58% at 82% 8%, var(--palette-blue-300), transparent)",
  "radial-gradient(ellipse 46% 64% at 94% 78%, var(--palette-red-200), transparent)",
  "radial-gradient(ellipse 46% 64% at 8% 92%, var(--palette-teal-300), transparent)",
].join(",");

function effectiveBand(status: string, confidence: number) {
  if (status === "manual" || status === "review") return status;
  if (confidence < 80) return "manual";
  if (confidence < 90) return "review";
  return status || "review";
}

function bandLabel(band: string) {
  if (band === "manual") return "Must check";
  if (band === "review") return "Lookup";
  return band;
}

function bandTint(band: string) {
  if (band === "manual") return "var(--palette-red-200)";
  if (band === "review") return "var(--palette-yellow-200)";
  return "var(--palette-gray-200)";
}

export function ReviewFrostCard({ item }: { item: ReviewCardItem }) {
  const href = routes.admin.reviewItem(item.id);
  const band = effectiveBand(item.reviewStatus, item.confidence);
  const stage = listingStage({
    lifecycle: item.status || "published",
    deadline: item.deadline
      ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
          new Date(item.deadline),
        )
      : undefined,
  });
  const scoreTitle =
    item.reviewScoreSource === "vertex"
      ? "AI score"
      : item.reviewScoreSource === "heuristic"
        ? "Heuristic"
        : "Score note";
  const scoreBody =
    item.reviewScoreReason ||
    (item.reviewMissing?.length
      ? `Missing ${item.reviewMissing.join(", ")}`
      : "No score note yet — refresh after sync if this stays empty.");

  return (
    <FrostCard
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--palette-gray-50)_62%,transparent)] p-0 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] backdrop-blur-md backdrop-saturate-150 md:p-0",
        "transition-transform duration-200 ease-out hover:z-10 hover:-translate-y-1 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:transform-none",
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5 px-5 pt-5">
        <StageBadge stage={stage} />
        <Badge
          variant="outline"
          className="ml-auto inline-flex h-6 items-center gap-1 border-0 px-2 pr-1 text-[0.625rem] text-foreground [&>svg]:size-3!"
          style={{
            backgroundColor: `color-mix(in srgb, ${bandTint(band)} 72%, transparent)`,
          }}
        >
          <HugeiconsIcon icon={BadgePercentIcon} strokeWidth={2} />
          {bandLabel(band)}
          <span className="inline-flex h-4 items-center rounded-full bg-white px-1.5 text-[0.625rem] font-semibold text-foreground">
            {item.confidence}%
          </span>
        </Badge>
      </div>
      <Link href={href} className="flex min-w-0 flex-1 flex-col">
        {item.department ? (
          <p className="flex min-w-0 items-center gap-1.5 px-5 pt-4 text-xs text-muted-foreground">
            <HugeiconsIcon
              icon={GuestHouseIcon}
              strokeWidth={1.75}
              className="size-3.5 shrink-0"
            />
            <span className="truncate">{item.department}</span>
          </p>
        ) : null}
        <div className={item.department ? "px-5 pb-5 pt-2" : "px-5 pb-5 pt-4"}>
          <h3
            title={item.title}
            className="line-clamp-3 min-h-[4.125em] text-base font-semibold leading-snug tracking-tight"
          >
            {item.title}
          </h3>
        </div>
      </Link>
      <div className="relative mt-auto overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: RAINBOW_GLOW } as CSSProperties}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--palette-black)_14%,transparent)]"
        />
        <div className="relative flex items-end justify-between gap-3 bg-[color-mix(in_srgb,white_40%,transparent)] px-5 py-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] backdrop-blur-3xl backdrop-saturate-150">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,white_18%,transparent)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] ring-1 ring-white/35 backdrop-blur-md backdrop-saturate-150">
                <HugeiconsIcon
                  icon={SparklesIcon}
                  strokeWidth={2}
                  className="size-4 text-foreground"
                />
              </span>
              <p className="text-sm font-semibold tracking-tight">{scoreTitle}</p>
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-[1.7] text-foreground">
              {scoreBody}
            </p>
          </div>
          <Link
            href={href}
            aria-label="Review record"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-0 bg-[color-mix(in_srgb,white_55%,transparent)] text-[var(--palette-gray-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-white/40 backdrop-blur-md backdrop-saturate-150 transition-[transform,background-color,color] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 motion-reduce:transition-none motion-reduce:hover:transform-none"
          >
            <HugeiconsIcon icon={ExpandIcon} strokeWidth={1.75} className="size-4" />
          </Link>
        </div>
      </div>
    </FrostCard>
  );
}
