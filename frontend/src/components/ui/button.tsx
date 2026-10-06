import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Frosted pill button, matched to the chrome Toggle.
 * Tint comes from `currentColor` (the variant’s text color). Pass `text-*`
 * or a CSS color on the button to recolor the glass without going solid.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-[color-mix(in_srgb,currentColor_28%,transparent)] font-medium whitespace-nowrap shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)] ring-1 ring-[color-mix(in_srgb,currentColor_42%,transparent)] backdrop-blur-md backdrop-saturate-150 transition-all outline-none select-none hover:bg-[color-mix(in_srgb,currentColor_40%,transparent)] focus-visible:ring-2 focus-visible:ring-ring/35 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:text-destructive aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[color-mix(in_srgb,var(--palette-teal-400)_32%,transparent)] text-[var(--palette-teal-800)] ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)] hover:bg-[color-mix(in_srgb,var(--palette-teal-400)_44%,transparent)]",
        orange:
          "bg-[color-mix(in_srgb,var(--palette-teal-400)_32%,transparent)] text-[var(--palette-teal-800)] ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)] hover:bg-[color-mix(in_srgb,var(--palette-teal-400)_44%,transparent)]",
        secondary: "text-secondary-foreground",
        outline:
          "bg-foreground/8 text-foreground ring-foreground/18 hover:bg-foreground/14",
        ghost:
          "bg-transparent text-foreground shadow-none ring-transparent backdrop-blur-none hover:bg-foreground/8 hover:ring-foreground/12 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:backdrop-blur-md",
        destructive: "text-destructive",
        chrome:
          "bg-white/15 text-white ring-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)] hover:bg-white/25",
        link: "bg-transparent text-[var(--palette-teal-700)] shadow-none ring-0 backdrop-blur-none hover:bg-transparent hover:underline hover:underline-offset-4",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3.5 text-xs/relaxed has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-6 gap-1 px-2.5 text-[0.625rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-2.5",
        sm: "h-7 gap-1 px-3 text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-10 gap-2 px-5 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-2.5",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-lg": "size-10 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
