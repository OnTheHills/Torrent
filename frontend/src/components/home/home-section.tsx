import type { ComponentProps, ReactNode } from "react";

import { ShellContent } from "@/components/layout/shell-content";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/** One column for the landing hero and every HomeBand / HomeRule. */
export const homeFrameClass = "mx-auto w-full max-w-6xl px-6";

export function HomeFrame({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <ShellContent>
      <div className={cn(homeFrameClass, className)} {...props}>
        {children}
      </div>
    </ShellContent>
  );
}

export function HomeSection({
  title,
  description,
  children,
  className,
  onDark = false,
}: {
  /** @deprecated Eyebrow pills removed from home sections. */
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  onDark?: boolean;
}) {
  return (
    <section className={cn("space-y-10", className)}>
      <div className="max-w-3xl space-y-4">
        <h2
          className={cn(
            "text-2xl font-semibold tracking-tight md:text-[2rem] md:leading-[1.2]",
            onDark && "text-white"
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "text-base leading-[1.7]",
              onDark ? "text-[var(--palette-teal-100)]" : "text-muted-foreground"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Full-width canvas fill. Content sits on Surface / Card inside the column. */
export function HomeBand({
  tone = "default",
  children,
}: {
  tone?: "default" | "paper" | "dark";
  children: ReactNode;
}) {
  return (
    <Surface
      tone="canvas"
      data-slot="page-band"
      className={cn(
        tone === "paper" && "story-paper",
        tone === "dark" && "bg-[var(--palette-teal-800)]",
        tone === "default" && "bg-background"
      )}
    >
      <HomeFrame className="py-8 md:py-12">{children}</HomeFrame>
    </Surface>
  );
}

export function HomeRule() {
  return <hr aria-hidden className="w-full border-0 border-t border-border" />;
}