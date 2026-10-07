import type { ReactNode } from "react";

import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export function MonitorSection({
  title,
  description,
  action,
  children,
  className,
  surfaceClassName,
  bare = false,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  surfaceClassName?: string;
  bare?: boolean;
}) {
  const showHeading = Boolean(title || description || action);

  return (
    <section className={cn(showHeading && "space-y-6", className)}>
      {showHeading ? (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            {title ? (
              <h2 className="text-2xl font-semibold tracking-tight md:text-[2rem] md:leading-[1.2]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-base leading-[1.7] text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {bare ? (
        children
      ) : (
        <Surface
          className={cn("bg-surface p-5 ring-transparent md:p-6", surfaceClassName)}
        >
          {children}
        </Surface>
      )}
    </section>
  );
}
