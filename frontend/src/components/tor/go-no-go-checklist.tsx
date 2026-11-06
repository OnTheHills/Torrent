"use client";

import { useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import {
  FrostCheckbox,
  frostSelectedItem,
} from "@/components/tor/tor-filters";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function GoNoGoChecklist({ requirements }: { requirements: string[] }) {
  const { t } = useLocale();
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const total = requirements.length;
  const done = Object.values(checked).filter(Boolean).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const isGo = total > 0 && done === total;

  return (
    <Card>
      <CardHeader className="gap-2 border-b border-border pb-5">
        <CardTitle className="text-lg md:text-xl">{t("goNoGoTitle")}</CardTitle>
        <CardDescription>{t("goNoGoHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <ul className="space-y-2">
          {requirements.map((item, index) => {
            const on = !!checked[index];
            return (
              <li key={item}>
                <button
                  type="button"
                  onClick={() =>
                    setChecked((prev) => ({ ...prev, [index]: !prev[index] }))
                  }
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-full px-2.5 py-2 text-left text-sm transition-colors hover:bg-sidebar-hover",
                    on && frostSelectedItem,
                  )}
                >
                  <FrostCheckbox checked={on} className="mt-0.5" />
                  <span className="leading-relaxed text-foreground">{item}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="rounded-xl border border-border bg-muted/50 px-4 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{t("goNoGoSummary")}</p>
            <p
              className={cn(
                "text-sm font-semibold",
                isGo ? "text-foreground" : "text-destructive",
              )}
            >
              {isGo ? t("goStatus") : t("noGoStatus")}
            </p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-background">
            <div
              className={cn(
                "h-full rounded-full bg-foreground/70 transition-all duration-300",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs tabular-nums text-muted-foreground">{pct}%</p>
        </div>
      </CardContent>
    </Card>
  );
}
