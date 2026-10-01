import * as React from "react"

import { Surface } from "@/components/ui/surface"
import { cn } from "@/lib/utils"

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
