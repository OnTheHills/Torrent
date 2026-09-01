"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { SourceBadge } from "@/components/tor/source-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Tor } from "@/types/tor";

export function SourceTransparencyPanel({ tor }: { tor: Tor }) {
  const { t } = useLocale();

  const confidence =
    tor.integrity === "suspicious"
      ? "low"
      : typeof tor.matchScore === "number" && tor.matchScore >= 85
        ? "high"
        : "medium";

  const confidenceLabel =
    confidence === "high"
      ? t("confidenceHigh")
      : confidence === "low"
        ? t("confidenceLow")
        : t("confidenceMedium");

  return (
    <Card>
      <CardHeader className="gap-2 border-b border-border pb-5">
        <CardTitle className="text-base md:text-lg">
          {t("sourceTransparencyTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5 text-sm">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t("sourceDocument")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge kind={tor.sourceKind} />
            <span className="font-mono text-xs text-muted-foreground">{tor.refId}</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t("lastExtracted")}
          </p>
          <p>{tor.publishedAt}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tor.integrity === "ok" ? (
            <Badge className="bg-emerald-500/15 text-emerald-300">
              {t("verified")}
            </Badge>
          ) : (
            <Badge variant="destructive">{t("integritySuspicious")}</Badge>
          )}
          <Badge variant="outline">
            {t("aiConfidence")}: {confidenceLabel}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
