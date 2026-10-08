"use client";

import type { CSSProperties } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon,
  Building03Icon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";

import { FrostCard } from "@/components/ui/frost-card";
import { cn } from "@/lib/utils";

const frostCard =
  "border-0 bg-[color-mix(in_srgb,var(--card-tint)_46%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 backdrop-blur-xl backdrop-saturate-150";

const TONE = {
  teal: {
    tint: "var(--palette-teal-100)",
    iconFg: "text-[var(--palette-teal-700)]",
    ring: "color-mix(in srgb, var(--palette-teal-300) 55%, transparent)",
  },
  blue: {
    tint: "var(--palette-blue-100)",
    iconFg: "text-[var(--palette-blue-800)]",
    ring: "color-mix(in srgb, var(--palette-blue-300) 55%, transparent)",
  },
  yellow: {
    tint: "var(--palette-yellow-100)",
    iconFg: "text-[var(--palette-yellow-700)]",
    ring: "color-mix(in srgb, var(--palette-yellow-300) 55%, transparent)",
  },
} as const;

const CARDS: {
  key: string;
  icon: IconSvgElement;
  tone: keyof typeof TONE;
}[] = [
  { key: "tracked", icon: SourceCodeIcon, tone: "teal" },
  { key: "agencies", icon: Building03Icon, tone: "blue" },
  { key: "queue", icon: Alert02Icon, tone: "yellow" },
];

export function AdminStats({
  tracked,
  agencies,
  queue,
}: {
  tracked: number;
  agencies: number;
  queue: number;
}) {
  const values = { tracked, agencies, queue };
  const labels = {
    tracked: "TORs tracked",
    agencies: "Agencies",
    queue: "Low-confidence queue",
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {CARDS.map((card) => (
        <FrostCard
          key={card.key}
          className={cn("flex h-full flex-col gap-4 rounded-lg p-6 md:p-5", frostCard)}
          style={
            {
              "--card-tint": TONE[card.tone].tint,
              "--surface-frost-ring": TONE[card.tone].ring,
            } as CSSProperties
          }
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--palette-white)]">
              <HugeiconsIcon
                icon={card.icon}
                strokeWidth={2}
                className={`size-5 ${TONE[card.tone].iconFg}`}
              />
            </span>
            <h3 className="text-xl font-semibold tracking-tight">
              {labels[card.key as keyof typeof labels]}
            </h3>
          </div>
          <p className="text-right text-3xl font-semibold tracking-tight tabular-nums">
            {values[card.key as keyof typeof values]}
          </p>
        </FrostCard>
      ))}
    </div>
  );
}
