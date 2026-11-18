"use client";

import * as React from "react";

import { liquidGlassClear, liquidGlassDim } from "@/components/ui/appbar";
import { cn } from "@/lib/utils";

export type ToggleOption<T extends string = string> = {
  value: T;
  label: React.ReactNode;
  ariaLabel?: string;
};

type ToggleProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly ToggleOption<T>[];
  /** Accessible name for the control group */
  "aria-label": string;
  className?: string;
  size?: "sm" | "default";
  /** `chrome` reads on the liquid-glass app bar pill. */
  tone?: "default" | "chrome";
};

const frostTrack = "backdrop-blur-md backdrop-saturate-150";

const pageFrostTrack = liquidGlassDim;

const chromeFrostTrack = liquidGlassDim;

/** Selected thumb — clear liquid glass with specular rim. */
const glassThumb = liquidGlassClear;

/**
 * Segmented toggle with liquid-glass track + selected thumb.
 * Track stays dim glass; the active option lifts as clear glass.
 */
function Toggle<T extends string>({
  value,
  onValueChange,
  options,
  "aria-label": ariaLabel,
  className,
  size = "default",
  tone = "default",
}: ToggleProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full p-0.5",
        frostTrack,
        tone === "chrome" ? chromeFrostTrack : pageFrostTrack,
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex flex-1 shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-[background,box-shadow,color,backdrop-filter] duration-200 ease-out",
              size === "sm"
                ? "h-6 min-w-6 px-1.5 text-[0.65rem]"
                : "h-8 min-w-8 px-3 text-xs",
              selected
                ? cn(glassThumb, "text-foreground")
                : "bg-transparent text-muted-foreground shadow-none ring-0 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export { Toggle };
