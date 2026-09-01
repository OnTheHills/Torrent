"use client";

import Link from "next/link";

import { AgencyStrip } from "@/components/home/agency-strip";
import { KpiStrip } from "@/components/home/kpi-strip";
import { LatestPanel } from "@/components/home/latest-panel";
import { SuspiciousPanel } from "@/components/home/suspicious-panel";
import { PageHeader } from "@/components/layout/page-header";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export function MonitorHome() {
  const { t } = useLocale();

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
      <PageHeader
        eyebrow={t("monitorEyebrow")}
        title={t("monitorTitle")}
        description={t("monitorDescription")}
        actions={
          <>
            <Button asChild size="sm">
              <Link href={routes.tors}>{t("browseTors")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={routes.dashboard}>{t("budgetDashboard")}</Link>
            </Button>
          </>
        }
      />

      <KpiStrip />

      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-2">
          <SuspiciousPanel />
        </div>
        <div className="lg:col-span-3">
          <LatestPanel />
        </div>
      </div>

      <AgencyStrip />
    </div>
  );
}
