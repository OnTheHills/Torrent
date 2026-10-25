import * as React from "react"

import { Surface } from "@/components/ui/surface"
import { cn } from "@/lib/utils"

/**
 * Clear frost — whiter, lighter fill than neutral filter frost.
 * Use for compact controls on pale panels (profile fields, soft cards).
 */
export const clearFrost =
  "border-0 bg-[image:var(--surface-clear-frost)] shadow-[inset_0_1px_0_0_var(--surface-clear-frost-highlight)] ring-1 ring-[var(--surface-clear-frost-ring)] backdrop-blur-md backdrop-saturate-150"

/** Thin clear-frost control (h-8 pill). */
export const clearFrostField =
  "h-8! w-full rounded-full border-0 bg-[image:var(--surface-clear-frost)] px-3.5 text-sm shadow-[inset_0_1px_0_0_var(--surface-clear-frost-highlight)] ring-1 ring-[var(--surface-clear-frost-ring)] backdrop-blur-md backdrop-saturate-150 focus-visible:border-transparent focus-visible:ring-[var(--surface-clear-frost-ring)]"

/**
 * Frosted glass panel. Sit it on a photographed or tinted field
 * (hero, dark band) so the blur has chroma to sample.
 */
function FrostCard({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Surface>, "tone">) {
  return (
    <Surface
      tone="frost"
      data-slot="frost-card"
      className={cn("p-6 md:p-8", className)}
      {...props}
    />
  )
}

function FrostPill({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="frost-pill"
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-full bg-[var(--palette-white)] px-2.5 text-[0.65rem] font-medium text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-900)_10%,transparent)]",
        className,
      )}
      {...props}
    />
  )
}

export { FrostCard, FrostPill }
