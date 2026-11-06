"use client";

import type { ComponentProps, ReactNode } from "react";

import { Surface } from "@/components/ui/surface";
import type { ListingStage } from "@/lib/listing-stage";
import { cn } from "@/lib/utils";

/** Slim filter + results grid used by listings, records, review, and users. */
export const filterPanelGridClass =
  "grid items-start gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[18.5rem_minmax(0,1fr)]";

export const frostClearButton =
  "inline-flex h-8 shrink-0 items-center rounded-full border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] px-3 text-sm text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:transform-none";

/** Flat selected fill — matches sidebar active tab. */
export const filterSelectedFill =
  "bg-sidebar-accent text-sidebar-accent-foreground shadow-none ring-0";

/** Admin Status filter — keep in sync with listings `stage*` dictionary keys. */
export const ADMIN_STATUS_FILTER_ITEMS: {
  value: ListingStage;
  label: string;
}[] = [
  { value: "open", label: "Open" },
  { value: "closing", label: "Closing soon (< 7 days)" },
  { value: "draft", label: "Draft TOR" },
  { value: "closed", label: "Closed" },
  { value: "awarded", label: "Winner announced" },
  { value: "cancelled", label: "Cancelled" },
];

/** Watch out / integrity — same idea as listings; API uses clear|watch. */
export const ADMIN_WATCH_OUT_FILTER_ITEMS: {
  value: "clear" | "watch";
  label: string;
}[] = [
  { value: "clear", label: "Clear" },
  { value: "watch", label: "Flagged" },
];

export function toggleMany<T extends string>(
  current: T[],
  value: T,
  checked: boolean,
) {
  if (!checked) return current.filter((item) => item !== value);
  return current.includes(value) ? current : [...current, value];
}

export function FilterPanelLayout({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn(filterPanelGridClass, className)} {...props} />;
}

export function FilterPanelAside({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "self-start lg:sticky lg:top-6",
        className,
      )}
    >
      <Surface className="bg-surface p-3.5 ring-transparent md:p-4">
        {children}
      </Surface>
    </aside>
  );
}

export function FilterPanelHeader({
  title = "Filters",
  clearLabel = "Clear",
  onClear,
}: {
  title?: string;
  clearLabel?: string;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <button type="button" onClick={onClear} className={frostClearButton}>
        {clearLabel}
      </button>
    </div>
  );
}

export function FilterPanelStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>{children}</div>
  );
}

export function FilterCountPill({
  children,
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm",
        filterSelectedFill,
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}
