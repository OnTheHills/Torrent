"use client";

import { useEffect, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SourceVerdict } from "@/config/agencies";
import type { SourceProbeResult } from "@/lib/sources/probe";

type HealthPayload = {
  probedAt: string;
  summary: {
    green: number;
    yellow: number;
    red: number;
    scrapeRequired: boolean;
    strategy: string;
  };
  results: SourceProbeResult[];
};

const VERDICT_KEY = {
  green: "verdictGreen",
  yellow: "verdictYellow",
  red: "verdictRed",
} as const;

function verdictVariant(verdict: SourceVerdict) {
  if (verdict === "green") return "default" as const;
  if (verdict === "yellow") return "secondary" as const;
  return "destructive" as const;
}

export function SourceHealthPanel() {
  const { t } = useLocale();
  const [data, setData] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sources/health")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<HealthPayload>;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Probe failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("sourceHealthTitle")}</CardTitle>
        <CardDescription>{t("sourceHealthSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : null}
        {!data && !error ? (
          <p className="text-sm text-muted-foreground">Probing sources…</p>
        ) : null}
        {data
          ? data.results.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {item.detail}
                  </p>
                  <p className="truncate text-[0.65rem] text-muted-foreground">
                    {item.status ? `HTTP ${item.status} · ` : ""}
                    {item.ms}ms
                  </p>
                </div>
                <Badge variant={verdictVariant(item.verdict)}>
                  {t(VERDICT_KEY[item.verdict])}
                </Badge>
              </div>
            ))
          : null}
      </CardContent>
    </Card>
  );
}
