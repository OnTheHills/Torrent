"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MOCK_SHOWCASE } from "@/data/mock";

export function ShowcaseView() {
  const { t } = useLocale();

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
      <PageHeader
        eyebrow={t("showcaseEyebrow")}
        title={t("showcaseTitle")}
        description={t("showcaseDescription")}
      />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
        {MOCK_SHOWCASE.map((entry) => (
          <Card key={entry.id} className="h-full">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{entry.category}</Badge>
                <span className="text-xs text-muted-foreground">{entry.year}</span>
              </div>
              <CardTitle className="text-base leading-snug">{entry.title}</CardTitle>
              <CardDescription>{entry.vendorName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>{entry.approach}</p>
              <p className="border-t border-border pt-3 text-foreground/85">
                <span className="font-medium text-foreground">{t("outcome")}: </span>
                {entry.outcome}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
