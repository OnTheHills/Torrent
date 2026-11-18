"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { HeroTitle } from "@/components/layout/hero-title";
import { ShellContent } from "@/components/layout/shell-content";
import { grayBlueprintStyle, heroFade } from "@/components/tor/listings-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const frostButton =
  "border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]";

/** Clear-button frost recipe, translucent so hero/orange shows through. */
export const frostGlassButton =
  "border-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--palette-gray-200)_78%,transparent),color-mix(in_srgb,var(--palette-gray-100)_68%,transparent))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_55%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[linear-gradient(180deg,color-mix(in_srgb,var(--palette-gray-200)_88%,transparent),color-mix(in_srgb,var(--palette-gray-100)_78%,transparent))]";

export const frostTealButton =
  "border-0 bg-[color-mix(in_srgb,var(--palette-teal-400)_32%,transparent)] text-[var(--palette-teal-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[color-mix(in_srgb,var(--palette-teal-400)_44%,transparent)]";

export const frostGreenButton =
  "border-0 bg-[color-mix(in_srgb,var(--palette-green-600)_28%,transparent)] text-[var(--palette-green-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-green-600)_42%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[color-mix(in_srgb,var(--palette-green-600)_40%,transparent)]";

export const frostRedButton =
  "border-0 bg-[color-mix(in_srgb,var(--palette-red-400)_28%,transparent)] text-[var(--palette-red-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-red-400)_48%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[color-mix(in_srgb,var(--palette-red-400)_40%,transparent)]";

export const sectionCard =
  "rounded-lg bg-[var(--palette-gray-50)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)]";

export const fieldClass =
  "h-8 w-full rounded-[6px] border-0 bg-white px-3 text-sm shadow-none ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_32%,transparent)] focus-visible:outline-none focus-visible:ring-[color-mix(in_srgb,var(--palette-teal-400)_45%,transparent)]";

/** Admin hero surface — same gray blueprint + fade recipe as the Listings hero. */
export function AdminHeroShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className="relative -mt-[144px] min-h-[24rem] overflow-hidden category-blueprint text-foreground md:min-h-[26rem]"
      style={grayBlueprintStyle}
    >
      <div aria-hidden className={heroFade} />
      <ShellContent className="relative z-10">
        <div
          className={cn(
            "relative mx-auto flex min-h-[20rem] max-w-6xl flex-col justify-end px-4 pb-10 pt-[calc(144px+1.25rem)] sm:px-6 md:min-h-[22rem] md:pb-12 md:pt-[calc(144px+1.75rem)]",
            className,
          )}
        >
          {children}
        </div>
      </ShellContent>
    </section>
  );
}

export function AdminHero({
  title,
  description,
  actions,
  leading,
  icon,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Optional left media (e.g. profile photo) as a square matching the copy block height. */
  leading?: React.ReactNode;
  /** Outline nav icon shown ahead of the title (same glyph as the sidebar tab). */
  icon?: React.ReactNode;
  className?: string;
}) {
  const copyRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(0);

  useLayoutEffect(() => {
    if (!leading) return;
    const node = copyRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.height ?? 0);
      if (next <= 0) return;
      setSide((current) => (current === next ? current : next));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [leading, title, description, actions, icon]);

  const copy = (
    <div ref={copyRef} className="relative z-10 w-full max-w-4xl lg:max-w-5xl">
      <HeroTitle icon={icon}>{title}</HeroTitle>
      {description ? (
        typeof description === "string" ? (
          <p className="mt-5 text-base leading-[1.7] text-muted-foreground md:text-lg">
            {description}
          </p>
        ) : (
          <div className="mt-5">{description}</div>
        )
      ) : null}
      {actions ? (
        <div className="mt-9 flex flex-wrap gap-3">{actions}</div>
      ) : null}
    </div>
  );

  return (
    <AdminHeroShell className={className}>
      {leading ? (
        <div className="flex items-start gap-5 md:gap-8">
          <div
            className="relative z-10 shrink-0 overflow-hidden"
            style={
              side > 0
                ? { width: side, height: side }
                : { width: 144, height: 144 }
            }
          >
            {leading}
          </div>
          <div className="min-w-0 flex-1">{copy}</div>
        </div>
      ) : (
        copy
      )}
    </AdminHeroShell>
  );
}

export function AdminBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ShellContent>
      <div
        className={cn(
          "mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 md:py-16",
          className,
        )}
      >
        {children}
      </div>
    </ShellContent>
  );
}

export function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="max-w-3xl space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[2rem] md:leading-[1.2]">{title}</h2>
        {description ? (
          <p className="text-base leading-[1.7] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function AdminPanel({
  title,
  description,
  children,
  action,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const hasHeader = Boolean(title || description || action);
  return (
    <section className={cn(sectionCard, "p-4 md:p-6")}>
      {hasHeader ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? (
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminButton({
  children,
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  tone?: "neutral" | "teal" | "glass" | "green" | "red";
}) {
  const toneClass =
    tone === "teal"
      ? frostTealButton
      : tone === "green"
        ? frostGreenButton
        : tone === "red"
          ? frostRedButton
          : tone === "glass"
            ? frostGlassButton
            : frostButton;
  return (
    <Button className={cn(toneClass, className)} {...props}>
      {children}
    </Button>
  );
}

export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: string;
  className?: string;
}) {
  const variant = verdict === "green" ? "default" : verdict === "red" ? "destructive" : "secondary";
  const label = verdict === "green" ? "Healthy" : verdict === "red" ? "Down" : "Check";
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

export function formatWhen(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${day}, ${time}`;
}

export function useAdminQuery<T>(path: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", path],
    queryFn: () => api<T>(path),
    placeholderData: keepPreviousData,
  });

  const reload = useCallback(
    async (_options?: { silent?: boolean }) => {
      await queryClient.refetchQueries({ queryKey: ["admin", path] });
    },
    [path, queryClient],
  );

  return {
    data: query.data ?? null,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : "Request failed"
      : null,
    loading: query.isLoading,
    fetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    reload,
  };
}

export function AdminStatus({
  loading,
  error,
}: {
  loading?: boolean;
  error?: string | null;
}) {
  if (error) return <p className="text-sm text-[var(--palette-red-700)]">{error}</p>;
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return null;
}

export const REASON_REQUIRED = "A reason of at least 3 characters is required.";

export function ReasonField({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <label className="block text-xs text-muted-foreground">
      Reason for this change
      <input
        className={cn(
          fieldClass,
          "mt-1",
          invalid &&
            "ring-[var(--palette-red-400)] placeholder:text-[var(--palette-red-600)] focus-visible:ring-[var(--palette-red-400)]",
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={invalid ? REASON_REQUIRED : "Required"}
        aria-invalid={invalid || undefined}
      />
    </label>
  );
}
