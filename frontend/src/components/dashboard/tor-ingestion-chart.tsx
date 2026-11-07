"use client";

import { useMemo, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { buildTorIngestionDays } from "@/lib/tor-ingestion";
import { bangkokToday } from "@/lib/listing-stage";
import type { Tor } from "@/types/tor";

const SERIES = [
  { key: "published", label: "ingestionPublished", color: "#16a34a", dash: undefined },
  { key: "drafted", label: "ingestionDrafted", color: "#ea580c", dash: "8 3" },
  { key: "closed", label: "ingestionClosed", color: "#dc2626", dash: "3 3" },
] as const;
const WIDTH = 900;
const HEIGHT = 340;
const LEFT = 64;
const RIGHT = 24;
const TOP = 24;
const BOTTOM = 64;

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

  const maximum = days.reduce((max, day) => Math.max(max, day.published, day.drafted, day.closed), 1);
  const step = Math.max(1, Math.ceil(maximum / 4));
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const x = (index: number) => LEFT + (days.length === 1 ? plotWidth / 2 : index * plotWidth / (days.length - 1));
  const y = (count: number) => HEIGHT - BOTTOM - count / (step * 4) * plotHeight;
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
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[640px]" role="group" tabIndex={0}
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
              <text x={LEFT - 10} y={y(count) + 4} textAnchor="end" className="fill-muted-foreground text-xs">{count.toLocaleString()}</text>
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
              {days.map((day, i) => (
                <circle key={day.date} cx={x(i)} cy={y(day[series.key])} r={activeDate === day.date ? 5 : 2.5}
                  fill={series.color} stroke="var(--background)" strokeWidth="1" />
              ))}
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
          <div role="tooltip" className="pointer-events-none absolute right-4 top-2 rounded-lg border bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-md">
            <p className="mb-1 font-medium">{formatDate(selected.date)}</p>
            {SERIES.map((series) => <p key={series.key}><span style={{ color: series.color }}>{t(series.label)}</span>: {selected[series.key].toLocaleString()} {t("ingestionCount")}</p>)}
          </div>
        ) : null}
      </div>
      <p id="ingestion-chart-help" className="mt-2 text-xs text-muted-foreground">{t("ingestionHover")}</p>
      <div aria-live="polite" className="sr-only">{selected ? `${formatDate(selected.date)}: ${SERIES.map((s) => `${t(s.label)} ${selected[s.key]}`).join(", ")}` : ""}</div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("ingestionMapping")}</p>
    </div>
  );
}
