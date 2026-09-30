import type { ReactNode } from "react";

import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export function MonitorSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight md:text-[2rem] md:leading-[1.2]">
            {title}
          </h2>
          {description ? (
            <p className="text-base leading-[1.7] text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <Surface className="bg-surface p-5 ring-transparent md:p-6">{children}</Surface>
    </section>
  );
}
