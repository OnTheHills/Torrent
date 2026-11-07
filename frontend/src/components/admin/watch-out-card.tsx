"use client";

import type { CSSProperties } from "react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useLocale } from "@/components/providers/locale-provider";
import { FrostCard } from "@/components/ui/frost-card";
import { cn } from "@/lib/utils";

/** Vague flag labels mistakenly saved as integrityNoteEn — never show as the body. */
const GENERIC_EN_NOTES = new Set([
  "Other procurement signal",
  "other",
]);

export type WatchOutData = {
  integrityStatus?: string | null;
  integrityFlags?: string[];
  integrityReason?: string | null;
  integrityNote?: string | null;
  integrityNoteEn?: string | null;
};

export function hasWatchOut(data?: WatchOutData | null) {
  if (!data) return false;
  const status = data.integrityStatus || "clear";
  if (status === "flagged" || status === "confirmed") return true;
  return Boolean(data.integrityFlags?.length);
}

function isGenericEnNote(value: string) {
  const text = value.trim();
  if (!text) return true;
  if (GENERIC_EN_NOTES.has(text)) return true;
  const parts = text.split(/\s·\s/);
  return parts.length > 1 && parts.every((part) => GENERIC_EN_NOTES.has(part));
}

export function WatchOutCard({
  data,
  className,
}: {
  data: WatchOutData;
  className?: string;
}) {
  const { locale, t } = useLocale();
  if (!hasWatchOut(data)) return null;

  const noteTh = data.integrityNote?.trim() || "";
  const noteEnRaw = data.integrityNoteEn?.trim() || "";
  const noteEn = noteEnRaw && !isGenericEnNote(noteEnRaw) ? noteEnRaw : "";
  // Body is prose only: Thai note, or 1:1 English translation — never flag labels.
  const summary =
    locale === "th" ? noteTh || t("watchOutFallback") : noteEn || t("watchOutFallback");

  return (
    <FrostCard
      className={cn(
        "flex flex-col gap-5 rounded-2xl border-0 bg-[color-mix(in_srgb,var(--palette-yellow-100)_72%,transparent)] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] ring-1 ring-[color-mix(in_srgb,var(--palette-yellow-300)_55%,transparent)] backdrop-blur-xl backdrop-saturate-150 md:p-6",
        className,
      )}
      style={
        {
          "--surface-frost-ring": "transparent",
          "--surface-frost-highlight": "transparent",
        } as CSSProperties
      }
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.95)] ring-1 ring-white/80">
          <HugeiconsIcon
            icon={Alert02Icon}
            strokeWidth={2}
            className="size-5 text-[var(--palette-yellow-800)]"
          />
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--palette-yellow-900)]">
          {t("watchOut")}
        </h2>
      </div>
      <p className="text-sm leading-[1.7] text-foreground md:text-base">
        {summary}
      </p>
    </FrostCard>
  );
}
