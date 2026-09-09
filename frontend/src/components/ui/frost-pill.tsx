import * as React from "react"

import { Surface } from "@/components/ui/surface"
import { cn } from "@/lib/utils"

/**
 * Long frosted pill. Same white frost as FrostCard; tint via className.
 * Pair with `FrostPillMark` for a leading icon.
 */
function FrostPill({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Surface>, "tone">) {
  return (
    <Surface
      tone="frost"
      data-slot="frost-pill"
      className={cn("flex items-center gap-3 rounded-full px-3 py-2.5 md:px-4", className)}
      {...props}
    />
  )
}

function FrostPillMark({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="frost-pill-mark"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        "bg-white/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)]",
        "ring-1 ring-white/75 backdrop-blur-md backdrop-saturate-150",
        className,
      )}
      {...props}
    />
  )
}

export { FrostPill, FrostPillMark }
