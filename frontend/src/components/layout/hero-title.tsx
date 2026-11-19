import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Page hero h1 with the outline sidebar glyph ahead of the title. */
export function HeroTitle({
  children,
  icon,
  className,
  preLine = false,
}: {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  /** Preserve newlines in marketing titles. */
  preLine?: boolean;
}) {
  return (
    <h1
      className={cn(
        "flex items-center gap-3 text-3xl font-semibold tracking-tight md:gap-4 md:text-5xl md:leading-[1.1]",
        className,
      )}
    >
      {icon ? (
        <span
          className="inline-flex size-[1em] shrink-0 items-center justify-center self-start [&_svg]:size-full"
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span className={cn("min-w-0", preLine && "whitespace-pre-line")}>
        {children}
      </span>
    </h1>
  );
}
