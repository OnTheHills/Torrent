"use client";

import { useMemo, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { buildTorIngestionDays } from "@/lib/tor-ingestion";
import { bangkokToday } from "@/lib/listing-stage";
import type { Tor } from "@/types/tor";

const SERIES = [
  { key: "published", label: "ingestionPublished", color: "#16a34a", dash: undefined },
  { key: "drafted", label: "ingestionDrafted", color: "#ca8a04", dash: "8 3" },
  { key: "closed", label: "ingestionClosed", color: "#dc2626", dash: "3 3" },
] as const;
const WIDTH = 900;
const HEIGHT = 340;
const LEFT = 64;
const RIGHT = 24;
const TOP = 28;
const BOTTOM = 64;

/** A single day far above the rest should not flatten every other point. */
function chartCeiling(values: number[]) {
  const ranked = values.filter((value) => value > 0).sort((a, b) => b - a);
  const peak = ranked[0] ?? 1;
  const next = ranked[1] ?? peak;
  const basis = peak > next * 4 ? next : peak;
  const padded = Math.max(basis, 1) * 1.08;
  const magnitude = 10 ** Math.floor(Math.log10(padded / 4));
  const step = [1, 2, 2.5, 5, 10]
    .map((factor) => factor * magnitude)
    .find((candidate) => candidate * 4 >= padded);
  return (step ?? magnitude * 10) * 4;
}

function tooltipStyle(anchorX: number, pointYs: number[]) {
  const highest = Math.min(...pointYs);
  const nearTop = highest < 96;
  const onRight = anchorX > WIDTH * 0.58;
  return {
    left: `${(anchorX / WIDTH) * 100}%`,
    top: `${(highest / HEIGHT) * 100}%`,
    transform: `${onRight ? "translateX(calc(-100% - 12px))" : "translateX(12px)"} ${nearTop ? "translateY(12px)" : "translateY(calc(-100% - 12px))"}`,
  };
}

export function TorIngestionChart({ tors }: { tors: Tor[] }) {
  const { t, locale } = useLocale();
  const today = bangkokToday();
  const days = useMemo(() => buildTorIngestionDays(tors, new Date(`${today}T12:00:00+07:00`)), [tors, today]);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const activeIndex = days.findIndex((day) => day.date === activeDate);
  const selected = days[activeIndex];
  const formatter = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric",
  });
  const formatDate = (date: string) => formatter.format(new Date(`${date}T00:00:00+07:00`));

  if (!days.length) {
    return <p className="py-16 text-center text-sm text-muted-foreground">{t("ingestionEmpty")}</p>;
  }

  const axisMax = chartCeiling(days.flatMap((day) => [day.published, day.drafted, day.closed]));
  const step = axisMax / 4;
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const x = (index: number) => LEFT + (days.length === 1 ? plotWidth / 2 : index * plotWidth / (days.length - 1));
  const y = (count: number) => HEIGHT - BOTTOM - Math.min(count, axisMax) / axisMax * plotHeight;
  const labelCount = Math.min(5, days.length);
  const tickIndices = Array.from({ length: labelCount }, (_, i) => Math.round(i * (days.length - 1) / Math.max(1, labelCount - 1)));

  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-5 text-sm" aria-label={t("ingestionLegend")}>
        {SERIES.map((series) => (
          <li key={series.key} className="flex items-center gap-2">
            <svg width="24" height="8" aria-hidden><line x1="0" x2="24" y1="4" y2="4" stroke={series.color} strokeWidth="2" strokeDasharray={series.dash} /></svg>
            {t(series.label)}
          </li>
        ))}
      </ul>
      <div className="relative overflow-x-auto">
        <div className="relative min-w-[640px]">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block w-full" role="group" tabIndex={0}
          aria-label={t("ingestionTitle")} aria-describedby="ingestion-chart-help"
          onFocus={() => setActiveDate(days[0].date)} onBlur={() => setActiveDate(null)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(event.key)) return;
            event.preventDefault();
            if (event.key === "Escape") { setActiveDate(null); return; }
            const next = event.key === "Home" ? 0 : event.key === "End" ? days.length - 1
              : Math.max(0, Math.min(days.length - 1, activeIndex + (event.key === "ArrowLeft" ? -1 : 1)));
            setActiveDate(days[next].date);
          }}
        >
          <title>{t("ingestionTitle")}</title>
          {Array.from({ length: 5 }, (_, i) => i * step).map((count) => (
            <g key={count}>
              <line x1={LEFT} x2={WIDTH - RIGHT} y1={y(count)} y2={y(count)} stroke="currentColor" className="text-border" strokeDasharray="4 4" />
              <text x={LEFT - 10} y={y(count) + 4} textAnchor="end" className="fill-muted-foreground text-xs">{Number.isInteger(count) ? count.toLocaleString() : count.toLocaleString(undefined, { maximumFractionDigits: 1 })}</text>
            </g>
          ))}
          {tickIndices.map((index) => (
            <text key={index} x={x(index)} y={HEIGHT - BOTTOM + 24}
              textAnchor={days.length === 1 ? "middle" : index === 0 ? "start" : index === days.length - 1 ? "end" : "middle"}
              className="fill-muted-foreground text-xs">{formatDate(days[index].date)}</text>
          ))}
          <text x={WIDTH / 2} y={HEIGHT - 6} textAnchor="middle" className="fill-muted-foreground text-xs">{t("ingestionDates")}</text>
          <text transform={`translate(14 ${TOP + plotHeight / 2}) rotate(-90)`} textAnchor="middle" className="fill-muted-foreground text-xs">{t("ingestionCount")}</text>
          {selected ? <line x1={x(activeIndex)} x2={x(activeIndex)} y1={TOP} y2={HEIGHT - BOTTOM} stroke="currentColor" className="text-muted-foreground" strokeDasharray="3 3" /> : null}
          {SERIES.map((series) => (
            <g key={series.key} pointerEvents="none">
              <polyline points={days.map((day, i) => `${x(i)},${y(day[series.key])}`).join(" ")}
                fill="none" stroke={series.color} strokeWidth="2" strokeLinejoin="round" strokeDasharray={series.dash} />
              {days.map((day, i) => {
                const count = day[series.key];
                const clipped = count > axisMax;
                return (
                  <g key={day.date}>
                    <circle cx={x(i)} cy={y(count)} r={activeDate === day.date ? 5 : 2.5}
                      fill={series.color} stroke="var(--background)" strokeWidth="1" />
                    {clipped ? (
                      <text
                        x={x(i)}
                        y={TOP - 8}
                        textAnchor={i < 2 ? "start" : i > days.length - 3 ? "end" : "middle"}
                        fill={series.color}
                        className="text-xs font-medium"
                      >
                        {count.toLocaleString()}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          ))}
          <rect x={LEFT} y={TOP} width={plotWidth} height={plotHeight} fill="transparent"
            onPointerMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const fraction = (event.clientX - bounds.left) / bounds.width;
              const index = Math.max(0, Math.min(days.length - 1, Math.round(fraction * (days.length - 1))));
              setActiveDate(days[index].date);
            }}
            onPointerLeave={() => setActiveDate(null)}
          />
        </svg>
        {selected ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 w-max rounded-xl bg-[rgb(255_255_255/0.7)] px-3 py-2 text-xs text-popover-foreground shadow-[inset_1px_1px_0_0_rgb(255_255_255/0.92),0_0_0_1px_color-mix(in_srgb,var(--palette-gray-300)_38%,transparent),0_8px_24px_rgb(0_0_0/0.07)] backdrop-blur-md backdrop-saturate-150"
            style={tooltipStyle(x(activeIndex), SERIES.map((series) => y(selected[series.key])))}
          >
            <p className="mb-1 font-medium">{formatDate(selected.date)}</p>
            {SERIES.map((series) => <p key={series.key}><span style={{ color: series.color }}>{t(series.label)}</span>: {selected[series.key].toLocaleString()} {t("ingestionCount")}</p>)}
          </div>
        ) : null}
        </div>
      </div>
      <p id="ingestion-chart-help" className="mt-2 text-xs text-muted-foreground">{t("ingestionHover")}</p>
      <div aria-live="polite" className="sr-only">{selected ? `${formatDate(selected.date)}: ${SERIES.map((s) => `${t(s.label)} ${selected[s.key]}`).join(", ")}` : ""}</div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("ingestionMapping")}</p>
    </div>
  );
}
