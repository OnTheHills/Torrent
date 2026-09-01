"use client";

import * as React from "react";

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

/**
 * Two-or-more option segmented toggle.
 * Active option gets a solid thumb — no absolute sliding math (avoids layout bugs).
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
        tone === "chrome"
          ? "bg-white/10 ring-1 ring-white/15"
          : "bg-muted",
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
              tone === "chrome"
                ? selected
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/55 hover:text-white"
                : selected
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
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
