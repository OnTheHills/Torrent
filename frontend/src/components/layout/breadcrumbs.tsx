"use client";

import Link from "next/link";
import { Fragment } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

export type BreadcrumbItem = {
  labelKey?: DictionaryKey;
  label?: string;
  href?: string;
};

export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  const { t } = useLocale();

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const label = item.labelKey ? t(item.labelKey) : (item.label ?? "");
          const isLast = index === items.length - 1;

          return (
            <Fragment key={`${label}-${index}`}>
              {index > 0 ? <span aria-hidden className="text-border">›</span> : null}
              <li>
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                ) : (
                  <span
                    className={cn(isLast && "font-medium text-foreground")}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
