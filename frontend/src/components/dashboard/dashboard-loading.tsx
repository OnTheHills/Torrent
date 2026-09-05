"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useLocale } from "@/components/providers/locale-provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardFetchStatus() {
  const { locale } = useLocale();

  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <span aria-hidden="true" className="size-4 rounded-full border-2 border-primary/25 border-t-primary motion-safe:animate-spin" />
      {locale === "th" ? "กำลังโหลดข้อมูลแดชบอร์ด…" : "Loading dashboard data…"}
    </p>
  );
}

export function DashboardLoading() {
  const { t } = useLocale();

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16" aria-busy="true">
      <PageHeader
        eyebrow={t("dashboardEyebrow")}
        title={t("dashboardTitle")}
        description={t("dashboardDescription")}
      />
      <DashboardFetchStatus />
      <div aria-hidden="true" className="space-y-10 md:space-y-12 motion-reduce:[&_*]:animate-none">
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} size="sm">
              <CardHeader className="gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        {["chart", "comparison", "history"].map((section) => (
          <Card key={section}>
            <CardHeader className="gap-2 border-b border-border pb-5">
              <Skeleton className="h-6 w-48 max-w-full" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex items-center gap-5">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className={section === "history" ? "h-8 flex-1" : "h-7 flex-1"} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
