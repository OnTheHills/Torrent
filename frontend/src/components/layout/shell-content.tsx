import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Inset text/controls so they clear the floating sidebar; parent bg stays full-bleed. */
export const shellContentClass = "pl-[var(--sidebar-offset)]";

export function ShellContent({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="shell-content"
      className={cn(shellContentClass, className)}
      {...props}
    />
  );
}
