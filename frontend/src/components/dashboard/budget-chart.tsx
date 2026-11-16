"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { categoryGlass } from "@/components/tor/listing-badges";
import { formatBudget } from "@/data/mock";
import { cn } from "@/lib/utils";
import type { BudgetBenchmark } from "@/types/tor";

// A fixed tick count keeps each category chart aligned and avoids visual jitter.
const AXIS_TICKS = 4;

export function BudgetChart({ data }: { data: BudgetBenchmark[] }) {
  const { t } = useLocale();
  const [hovered, setHovered] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <p className="text-sm font-medium">{t("emptyBudgetData")}</p>
      </div>
    );
  }

  // Every bar uses one shared maximum so categories can be compared honestly.
  const maxMedian = Math.max(...data.map((item) => item.medianThb));

  const ticks = Array.from({ length: AXIS_TICKS + 1 }, (_, index) =>
    Math.round((maxMedian * index) / AXIS_TICKS)
  );

  return (
    <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-[7.5rem] right-0 max-sm:left-0"
          >
            {ticks.map((tick, index) => (
              <div
                key={tick}
                className="absolute top-0 bottom-0 border-l border-dashed border-border/70"
                style={{ left: `${(index / AXIS_TICKS) * 100}%` }}
              />
            ))}
          </div>

          <ul className="relative space-y-3">
            {data.map((item) => {
              const width = Math.max(
                4,
                Math.round((item.medianThb / maxMedian) * 100)
              );
              const tone = categoryGlass(item.category);
              const active = hovered === item.category;

              return (
                <li
                  key={item.category}
                  className="group grid items-center gap-3 sm:grid-cols-[7.5rem_1fr]"
                  onMouseEnter={() => setHovered(item.category)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <p className="break-words text-sm font-medium leading-snug text-foreground">
                    {item.category}
                  </p>
                  <div className="relative">
                    <CategoryBar
                      label={formatBudget(item.medianThb)}
                      width={width}
                      fill={tone.fill}
                      ink={tone.ink}
                      active={active}
                    />
                    <BudgetTip active={active}>
                      <p className="font-medium">{item.category}</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground marker:text-muted-foreground">
                        <li>
                          {t("chartMedian")} {formatBudget(item.medianThb)}
                        </li>
                        <li>
                          {t("chartRange")} {formatBudget(item.minThb)} –{" "}
                          {formatBudget(item.maxThb)}
                        </li>
                        <li>
                          {item.count} {t("chartSample")}
                        </li>
                      </ul>
                    </BudgetTip>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
  );
}

export function BudgetTip({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const tipRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState({ below: false, left: 0 });

  useLayoutEffect(() => {
    if (!active) return;
    const tip = tipRef.current;
    const row = tip?.parentElement;
    if (!tip || !row) return;

    const measure = () => {
      const bar = row.querySelector<HTMLElement>("[data-budget-bar]");
      if (!bar) return;
      const label = row.querySelector<HTMLElement>("[data-budget-label]");
      const rowBox = row.getBoundingClientRect();
      const barBox = bar.getBoundingClientRect();
      const after = (label?.getBoundingClientRect().right ?? barBox.right) - rowBox.left;
      const fits = after + 8 + tip.offsetWidth <= row.clientWidth + 1;
      setPlace({
        below: !fits,
        left: fits ? after + 8 : barBox.right - rowBox.left,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={tipRef}
      role="tooltip"
      className="pointer-events-none absolute z-10 w-max max-w-[16rem] rounded-xl bg-[rgb(255_255_255/0.7)] px-3 py-2 text-xs text-popover-foreground shadow-[inset_1px_1px_0_0_rgb(255_255_255/0.92),0_0_0_1px_color-mix(in_srgb,var(--palette-gray-300)_38%,transparent),0_8px_24px_rgb(0_0_0/0.07)] backdrop-blur-md backdrop-saturate-150"
      style={
        place.below
          ? { left: place.left, top: "calc(100% + 8px)", transform: "translateX(-100%)" }
          : { left: place.left, top: 0 }
      }
    >
      {children}
    </div>
  );
}

function CategoryBar({
  label,
  width,
  fill,
  ink,
  active,
}: {
  label: string;
  width: number;
  fill: string;
  ink: string;
  active: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [outside, setOutside] = useState(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const labelEl = labelRef.current;
      if (!labelEl) return;
      const barWidth = (track.clientWidth * width) / 100;
      setOutside(labelEl.scrollWidth + 16 > barWidth);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [width, label]);

  return (
    <div ref={trackRef} className="flex h-8 min-w-0 items-center">
      <div
        data-budget-bar
        className={cn(
          "flex h-full min-w-0 shrink-0 items-center justify-end overflow-hidden rounded-sm border-0 transition-[width,filter] duration-500",
          outside ? "px-0" : "px-2",
          active && "brightness-105",
        )}
        style={{
          width: `${width}%`,
          color: ink,
          background: `color-mix(in srgb, ${fill} 92%, transparent)`,
          boxShadow: "var(--liquid-glass-edge)",
          WebkitBackdropFilter: "var(--liquid-glass-filter)",
          backdropFilter: "var(--liquid-glass-filter)",
        }}
      >
        {outside ? null : (
          <span
            ref={labelRef}
            className="shrink-0 whitespace-nowrap text-[0.65rem] font-semibold"
          >
            {label}
          </span>
        )}
      </div>
      {outside ? (
        <span
          ref={labelRef}
          data-budget-label
          className="ml-2 shrink-0 whitespace-nowrap text-[0.65rem] font-semibold"
          style={{ color: ink }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
