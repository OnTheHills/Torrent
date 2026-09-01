"use client";

import { useLocale } from "@/components/providers/locale-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MOCK_VENDOR_CAPABILITIES } from "@/data/mock";
import { cn } from "@/lib/utils";
import type { Tor } from "@/types/tor";

export function ProfileFitPanel({ tor }: { tor: Tor }) {
  const { t } = useLocale();
  const caps = MOCK_VENDOR_CAPABILITIES.map((item) => item.toLowerCase());

  const covered = tor.skills.filter((skill) =>
    caps.some((cap) => cap === skill.toLowerCase() || cap.includes(skill.toLowerCase()))
  );
  const gaps = tor.skills.filter((skill) => !covered.includes(skill));
  const pct =
    tor.skills.length === 0
      ? 0
      : Math.round((covered.length / tor.skills.length) * 100);
  const strong = pct >= 60;

  return (
    <Card>
      <CardHeader className="gap-2 border-b border-border pb-5">
        <CardTitle className="text-lg md:text-xl">{t("goNoGoTitle")}</CardTitle>
        <CardDescription>{t("goNoGoHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{t("goNoGoSummary")}</p>
            <p
              className={cn(
                "text-sm font-semibold",
                strong
                  ? "text-emerald-300"
                  : "text-muted-foreground"
              )}
            >
              {strong ? t("goStatus") : t("noGoStatus")}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
            <div
              className={cn(
                "h-full rounded-full",
                strong ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs tabular-nums text-muted-foreground">{pct}%</p>
        </div>

        {covered.length ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {t("profileFitCovered")}
            </p>
            <ul className="flex flex-wrap gap-2">
              {covered.map((item) => (
                <li
                  key={item}
                  className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {gaps.length ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {t("profileFitGaps")}
            </p>
            <ul className="flex flex-wrap gap-2">
              {gaps.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
