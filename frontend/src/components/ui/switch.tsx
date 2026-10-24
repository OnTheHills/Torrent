"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  id,
  "aria-label": ariaLabel,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full ring-1 backdrop-blur-md backdrop-saturate-150 transition-[background-color,box-shadow] duration-200 ease-out outline-none",
        "shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)]",
        "focus-visible:ring-2 focus-visible:ring-ring/35",
        "motion-reduce:transition-none",
        checked
          ? "bg-[color-mix(in_srgb,var(--palette-green-600)_72%,white)] ring-[color-mix(in_srgb,var(--palette-green-600)_42%,transparent)]"
          : "bg-[color-mix(in_srgb,white_72%,transparent)] ring-[color-mix(in_srgb,var(--palette-gray-900)_12%,transparent)]",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-[color-mix(in_srgb,white_92%,transparent)] shadow-[inset_0_1px_0_0_white,0_1px_2px_color-mix(in_srgb,var(--palette-gray-900)_14%,transparent)] backdrop-blur-sm transition-transform duration-200 ease-out",
          "motion-reduce:transition-none",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
