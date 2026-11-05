"use client";

import { useId, useMemo } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { budgetBoundaryLabels, buildBudgetDistribution } from "@/lib/budget-distribution";
import type { Tor } from "@/types/tor";

export function BudgetDistributionChart({ tors, isPending = false, isError = false }: {
  tors: Tor[];
  isPending?: boolean;
  isError?: boolean;
}) {
  const { t, locale } = useLocale();
  const tooltipPrefix = useId();
  const bins = useMemo(() => buildBudgetDistribution(tors), [tors]);
  const labels = useMemo(() => budgetBoundaryLabels(bins), [bins]);
  const fullBudget = (value: number) => `฿${value.toLocaleString(locale === "th" ? "th-TH" : "en-GB", { maximumSignificantDigits: 17 })}`;

  if (isPending && !isError) return <div role="status" aria-label={t("distributionLoading")} className="h-80 animate-pulse rounded-lg bg-background/60" />;
  if (isError && !tors.length) return <p role="alert" className="py-16 text-center text-sm text-muted-foreground">{t("distributionError")}</p>;
  if (!bins.length) return <p className="py-16 text-center text-sm text-muted-foreground">{t("distributionEmpty")}</p>;

  const maximum = Math.max(...bins.map((bin) => bin.count));
  const step = Math.max(1, Math.ceil(maximum / 4));
  const yMax = step * 4;
  const columns = { gridTemplateColumns: `repeat(${bins.length}, minmax(0, 1fr))` };
  const range = (index: number) => {
    const bin = bins[index];
    if (!Number.isFinite(bin.upper)) return `> ${fullBudget(bin.lower)}`;
    return `${bin.includesLower ? "[" : "("}${fullBudget(bin.lower)}, ${fullBudget(bin.upper)}${bin.includesUpper ? "]" : ")"}`;
  };
  return (
    <div>
      {isError ? <p role="status" className="mb-3 text-sm text-muted-foreground">{t("distributionStale")}</p> : null}
      <p className="mb-2 text-xs text-muted-foreground">{t("distributionCount")}</p>
      {/* Keep above-bar counts and the top axis tick inside the scroll viewport. */}
      <div className="overflow-x-auto pb-2 pt-8">
        <div className="grid min-w-[640px] grid-cols-[3rem_1fr] gap-x-3">
          <div aria-hidden className="relative h-64 text-right text-xs text-muted-foreground">
            {Array.from({ length: 5 }, (_, i) => i * step).map((count) => (
              <span key={count} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - count / yMax * 100}%` }}>{count.toLocaleString()}</span>
            ))}
          </div>
          <div className="relative h-64 border-b border-border">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              {Array.from({ length: 5 }, (_, i) => i).map((i) => <div key={i} className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${i * 25}%` }} />)}
            </div>
            <ol className="relative grid h-full gap-1" style={columns} aria-label={t("distributionTitle")}>
              {bins.map((bin, index) => (
                <li key={index} className="group relative flex h-full items-end">
                  <div tabIndex={0} role="group" aria-describedby={`${tooltipPrefix}-${index}`}
                    aria-label={`${t("distributionCount")}: ${bin.count}; ${t("distributionRange")}: ${range(index)}`}
                    className="absolute inset-0 z-10 rounded-sm outline-offset-2" />
                  <div data-budget-bin={index} className="relative w-full rounded-t-sm bg-sky-500/70 ring-1 ring-inset ring-sky-500/30 transition-[height] duration-500 group-hover:bg-sky-500/90 group-focus-within:bg-sky-500/90"
                    style={{ height: `${bin.count / yMax * 100}%` }}>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium">{bin.count.toLocaleString()}</span>
                  </div>
                  <div id={`${tooltipPrefix}-${index}`} role="tooltip"
                    className={`pointer-events-none absolute top-1 z-20 w-max max-w-[min(22rem,75vw)] rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-md group-hover:opacity-100 group-focus-within:opacity-100 ${index < 3 ? "left-0" : "right-0"}`}>
                    <p>{t("distributionCount")}: {bin.count.toLocaleString()}</p>
                    <p className="mt-1 break-words">{t("distributionRange")}: {range(index)} THB</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div />
          <div className="mt-3 grid gap-1 text-center text-[0.65rem] leading-relaxed text-muted-foreground" style={columns}>
            {bins.map((bin, index) => (
              <p key={index} className="break-words">
                {!Number.isFinite(bin.upper) ? "> ฿10M" : index === 0 ? (
                  bin.includesUpper ? `≤ ${labels[index + 1]}` : `${t("distributionLessThan")} ${labels[index + 1]}`
                ) : <><span className="block">[{labels[index]} –</span><span>{labels[index + 1]}{bin.includesUpper ? "]" : ")"}</span></>}
              </p>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">{t("distributionAxis")}</p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("distributionNote")}</p>
    </div>
  );
}
