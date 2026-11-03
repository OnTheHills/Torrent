"use client";

import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Clear liquid-glass surface — same Regular light formula as the sidebar
 * (low white tint + vibrancy), not opaque gray frost.
 */
export const frostSurface =
  "border-0 bg-[rgb(255_255_255_/_0.14)] text-foreground shadow-[inset_1px_1px_0_0_rgb(255_255_255_/_0.48),inset_-1px_-1px_0_0_rgb(255_255_255_/_0.1),0_8px_28px_rgb(0_0_0_/_0.1)] ring-1 ring-[rgb(255_255_255_/_0.38)] backdrop-blur-[22px] backdrop-saturate-150";

/** Flat dim selected fill — matches sidebar selected pill (`--sidebar-accent`). */
export const frostPopupItemActive =
  "bg-sidebar-accent! text-sidebar-accent-foreground! shadow-none! ring-0!";

/** Same frost circle language as SaveTorButton appearance="frost-circle". */
export const frostCircleControl = cn(
  "inline-flex size-7 shrink-0 items-center justify-center rounded-full outline-none transition-[transform,background-color,color] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgb(255_255_255_/_0.55)] data-[state=open]:ring-1 data-[state=open]:ring-[rgb(255_255_255_/_0.55)] motion-reduce:transition-none motion-reduce:hover:transform-none",
  frostSurface,
);

export const frostPopupPanel = cn(
  "min-w-40 rounded-2xl p-1.5 text-foreground",
  frostSurface,
  "bg-[rgb(255_255_255_/_0.14)]! shadow-[inset_1px_1px_0_0_rgb(255_255_255_/_0.48),inset_-1px_-1px_0_0_rgb(255_255_255_/_0.1),0_8px_28px_rgb(0_0_0_/_0.1)]!",
);

/** Menu row: clear hover, flat dim highlight/selected (no lift). */
export const frostPopupItem = cn(
  "rounded-full px-3 text-foreground outline-none transition-[background-color,color] duration-150 ease-out [&_svg]:text-current",
  "hover:bg-sidebar-hover",
  "focus:bg-sidebar-accent! focus:text-sidebar-accent-foreground! focus:shadow-none! focus:ring-0! focus:**:text-sidebar-accent-foreground!",
  "data-[highlighted]:bg-sidebar-accent! data-[highlighted]:text-sidebar-accent-foreground! data-[highlighted]:shadow-none! data-[highlighted]:ring-0! data-[highlighted]:**:text-sidebar-accent-foreground!",
);

function FrostPopup({
  ...props
}: React.ComponentProps<typeof DropdownMenu>) {
  return <DropdownMenu data-slot="frost-popup" {...props} />;
}

function FrostPopupTrigger({
  className,
  variant = "plain",
  ...props
}: React.ComponentProps<typeof DropdownMenuTrigger> & {
  variant?: "plain" | "circle";
}) {
  return (
    <DropdownMenuTrigger
      data-slot="frost-popup-trigger"
      className={cn(variant === "circle" && frostCircleControl, className)}
      {...props}
    />
  );
}

function FrostPopupContent({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="frost-popup-content"
      align={align}
      sideOffset={sideOffset}
      className={cn(frostPopupPanel, className)}
      {...props}
    />
  );
}

function FrostPopupItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem
      data-slot="frost-popup-item"
      className={cn(frostPopupItem, className)}
      {...props}
    />
  );
}

export {
  FrostPopup,
  FrostPopupTrigger,
  FrostPopupContent,
  FrostPopupItem,
};
