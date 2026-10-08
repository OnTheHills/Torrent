"use client";

import * as React from "react";

import { chromeFrostBar, chromeFrostTeal } from "@/components/ui/appbar";
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
  /** `chrome` reads on the app bar / sidebar surfaces. */
  tone?: "default" | "chrome";
};

const frostTrack =
  "backdrop-blur-md backdrop-saturate-150";

const pageFrostTrack =
  "bg-surface-frost shadow-[inset_0_1px_0_0_var(--surface-frost-highlight)] ring-1 ring-[var(--surface-frost-ring)]";

const chromeFrostTrack = chromeFrostBar;

const pageFrostThumb =
  "bg-[var(--toggle-thumb)] shadow-none ring-0 backdrop-blur-md";

const chromeFrostThumb = chromeFrostTeal;

/**
 * Frosted segmented toggle. Track and thumb stay translucent + blurred
 * so they read as glass in both light and dark.
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
        className
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
              "inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors",
              size === "sm" ? "h-6 min-w-6 px-1.5 text-[0.65rem]" : "h-7 min-w-7 px-2.5 text-xs",
              selected
                ? tone === "chrome"
                  ? chromeFrostThumb
                  : cn(pageFrostThumb, "text-foreground")
                : tone === "chrome"
                  ? "text-[var(--palette-teal-100)]/60 hover:text-[var(--palette-teal-50)]"
                  : "text-muted-foreground hover:text-foreground"
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
