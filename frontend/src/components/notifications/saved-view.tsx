"use client";

import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { useLocale } from "@/components/providers/locale-provider";
import { useSaved } from "@/components/providers/saved-provider";
import { TorCard } from "@/components/tor/tor-card";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { MOCK_TORS } from "@/data/mock";

export function SavedView() {
  const { t } = useLocale();
  const { savedIds, ready } = useSaved();

  const savedTors = MOCK_TORS.filter((tor) => savedIds.includes(tor.id));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("savedEyebrow")}
        title={t("savedTitle")}
        description={t("savedDescription")}
      />

      {!ready ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
          …
        </div>
      ) : savedTors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-heading text-lg font-medium">{t("savedEmpty")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("savedEmptyHint")}</p>
          <Button asChild variant="outline" size="sm" className="mt-5">
            <Link href={routes.app.tors}>{t("browseTors")}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {savedTors.map((tor) => (
            <TorCard key={tor.id} tor={tor} />
          ))}
        </div>
      )}
    </div>
  );
}
