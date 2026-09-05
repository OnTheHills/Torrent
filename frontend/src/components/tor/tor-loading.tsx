"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useLocale } from "@/components/providers/locale-provider";
import { Skeleton } from "@/components/ui/skeleton";

export function TorFetchStatus() {
  const { locale } = useLocale();

  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <span aria-hidden="true" className="size-4 rounded-full border-2 border-primary/25 border-t-primary motion-safe:animate-spin" />
      {locale === "th" ? "กำลังโหลดรายการ TOR…" : "Loading TOR listings…"}
    </p>
  );
}

export function TorLoading({ vendor = false }: { vendor?: boolean }) {
  const { t } = useLocale();

  return (
    <div className="space-y-8" aria-busy="true">
      <PageHeader
        eyebrow={t("opportunitiesEyebrow")}
        title={vendor ? t("vendorCatalogTitle") : t("opportunitiesTitle")}
        description={vendor ? t("vendorCatalogDescription") : t("opportunitiesDescription")}
      />
      <TorFetchStatus />
      <div aria-hidden="true" className="space-y-3 motion-reduce:[&_*]:animate-none">
        <Skeleton className="h-9 w-full sm:max-w-sm" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="pt-5">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="grid grid-cols-[3fr_1fr] gap-8 border-b border-border/70 py-6 sm:grid-cols-[3fr_1.5fr_0.5fr]">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="hidden h-5 w-12 rounded-full sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
