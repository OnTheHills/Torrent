"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { fetchTors } from "@/lib/api";

import { MonitorSection } from "@/components/monitor/monitor-section";
import { useLocale } from "@/components/providers/locale-provider";
import { AgencyBadge } from "@/components/tor/agency-badge";
import { IntegrityBadge } from "@/components/tor/integrity-badge";
import { Button } from "@/components/ui/button";
import { FrostCard } from "@/components/ui/frost-card";
import { routes } from "@/config/routes";
import {
  formatBudgetCompact,
  formatDate,
  torAgencyLine,
  torTitle,
} from "@/data/mock";

export function SuspiciousPanel() {
  const { locale, t } = useLocale();
  const { data: tors = [] } = useQuery({ queryKey: ["tors"], queryFn: fetchTors });

  const flagged = tors
    .filter((tor) => tor.integrity === "suspicious")
    .slice(0, 5);

  return (
    <MonitorSection
      title={t("suspiciousTitle")}
      description={t("suspiciousSubtitle")}

    >
      {flagged.length > 0 ? (
        <ul className="grid gap-4">
          {flagged.map((tor) => (
            <li key={tor.id}>
              <FrostCard
                asChild
                className="relative flex h-full flex-col gap-3 rounded-lg p-5 transition-transform duration-200 ease-out hover:z-10 hover:-translate-y-1 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:transform-none md:p-5"
              >
                <Link href={routes.tor(tor.id)}>
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--palette-yellow-75)]">
                      <HugeiconsIcon
                        icon={Alert02Icon}
                        strokeWidth={2}
                        className="size-5 text-[var(--palette-yellow-700)]"
                      />
                    </span>
                    <IntegrityBadge status="suspicious" />
                  </div>
                  <h3 className="text-base font-semibold leading-snug tracking-tight">
                    {torTitle(tor, locale)}
                  </h3>
                  <p className="text-sm leading-[1.7] text-muted-foreground">
                    {torAgencyLine(tor, locale)}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <AgencyBadge agencyId={tor.agencyId} />
                  </div>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-1">
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {t("budget")}
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatBudgetCompact(tor.budgetThb, locale)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {t("publishedAt")}
                      </p>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {formatDate(tor.publishedAt, locale)}
                      </p>
                    </div>
                  </div>
                </Link>
              </FrostCard>
            </li>
          ))}
        </ul>
      ) : (
        <FrostCard className="flex flex-col gap-4 rounded-lg p-6 md:p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--palette-yellow-75)]">
              <HugeiconsIcon
                icon={Alert02Icon}
                strokeWidth={2}
                className="size-5 text-[var(--palette-yellow-700)]"
              />
            </span>
            <h3 className="text-xl font-semibold tracking-tight">
              {t("integrityEmptyTitle")}
            </h3>
          </div>
          <p className="text-sm leading-[1.7] text-muted-foreground">
            {t("integrityEmptyBody")}
          </p>
          <Button asChild variant="outline" className="mt-auto w-fit">
            <Link href={routes.tors}>
              {t("browseTors")}
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
            </Link>
          </Button>
        </FrostCard>
      )}
    </MonitorSection>
  );
}
