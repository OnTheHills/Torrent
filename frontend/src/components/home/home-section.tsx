import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function HomeSection({
  eyebrow,
  title,
  description,
  children,
  className,
  onDark = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  onDark?: boolean;
}) {
  return (
    <section className={cn("space-y-10", className)}>
      <div className="max-w-3xl space-y-4">
        <p
          className={cn(
            "flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em]",
            onDark ? "text-[var(--palette-teal-200)]" : "text-primary"
          )}
        >
          <span
            className={cn(
              "h-px w-6",
              onDark ? "bg-[var(--palette-teal-300)]" : "bg-primary"
            )}
          />
          {eyebrow}
        </p>
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

export function HomeBand({
  tone = "default",
  children,
}: {
  tone?: "default" | "paper" | "dark";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        tone === "paper" && "story-paper",
        tone === "dark" && "bg-[var(--palette-teal-800)]",
        tone === "default" && "bg-background"
      )}
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">{children}</div>
    </div>
  );
}
