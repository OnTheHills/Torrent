"use client";

import Link from "next/link";

import { useAudience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { SaveTorButton } from "@/components/tor/save-tor-button";
import { IntegrityBadge } from "@/components/tor/integrity-badge";
import { MatchBadge } from "@/components/tor/match-badge";
import { listingHref } from "@/config/routes";
import {
  formatBudgetCompact,
  formatDate,
  torAgencyLine,
  torTitle,
} from "@/data/mock";
import type { Tor } from "@/types/tor";

export function TorTable({ tors }: { tors: Tor[] }) {
  const { locale, t } = useLocale();
  const audience = useAudience();
  const vendor = audience === "vendor";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            <th className="py-3 pr-4 font-medium">{t("project")}</th>
            <th className="px-4 py-3 font-medium">{t("agency")}</th>
            <th className="px-4 py-3 font-medium">{t("budget")}</th>
            <th className="px-4 py-3 font-medium">{t("deadline")}</th>
            {vendor ? (
              <th className="px-4 py-3 font-medium">{t("match")}</th>
            ) : null}
            <th className="py-3 pl-4 font-medium">{t("status")}</th>
            {vendor ? <th className="w-12 py-3 pl-2" /> : null}
          </tr>
        </thead>
        <tbody>
          {tors.map((tor) => (
            <tr key={tor.id} className="border-b border-border/70 last:border-0">
              <td className="py-4 pr-4">
                <Link
                  href={listingHref(tor.id, audience)}
                  className="block hover:text-primary"
                >
                  <p className="font-medium">{torTitle(tor, locale)}</p>
                  <p className="text-xs text-muted-foreground">{tor.refId}</p>
                </Link>
              </td>
              <td className="px-4 py-4 text-muted-foreground">
                {torAgencyLine(tor, locale)}
              </td>
              <td className="px-4 py-4 font-medium tabular-nums">
                {formatBudgetCompact(tor.budgetThb, locale)}
              </td>
              <td className="px-4 py-4 text-muted-foreground tabular-nums">
                {formatDate(tor.deadline, locale)}
              </td>
              {vendor ? (
                <td className="px-4 py-4">
                  {typeof tor.matchScore === "number" ? (
                    <MatchBadge score={tor.matchScore} />
                  ) : (
                    "—"
                  )}
                </td>
              ) : null}
              <td className="py-4 pl-4">
                <IntegrityBadge status={tor.integrity} />
              </td>
              {vendor ? (
                <td className="py-4 pl-2">
                  <SaveTorButton
                    torId={tor.id}
                    size="icon"
                    variant="ghost"
                    showLabel={false}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
