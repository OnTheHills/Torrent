"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { SourceBadge } from "@/components/tor/source-badge";
import { AGENCIES } from "@/config/agencies";
import { listingsHref, routes } from "@/config/routes";

const TONES = [
  "bg-[var(--palette-teal-200)]",
  "bg-[var(--palette-teal-100)]",
  "bg-[var(--palette-orange-100)]",
  "bg-[var(--palette-orange-200)]",
  "bg-[var(--palette-gray-100)]",
];

export function AgencyStrip() {
  const { locale, t } = useLocale();

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-[var(--palette-gray-800)]">
            {t("agenciesTitle")}
          </h3>
          <p className="max-w-2xl text-sm leading-[1.625] text-[var(--palette-gray-700)]">
            {t("coverageHint")}
          </p>
        </div>
        <Link
          href={routes.tors}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--palette-gray-800)] hover:underline"
        >
          {t("viewAllTors")}
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {AGENCIES.map((agency, index) => {
          const source = agency.sources[0];
          return (
            <li key={agency.id}>
              <Link
                href={listingsHref(agency.id)}
                className={`flex h-full flex-col gap-3 rounded-[8px] p-4 ${TONES[index % TONES.length]}`}
              >
                <span className="text-lg font-semibold tracking-tight text-[var(--palette-gray-800)]">
                  {locale === "th" ? agency.shortTh : agency.shortEn}
                </span>
                <span className="text-xs leading-relaxed text-[var(--palette-gray-700)]">
                  {locale === "th" ? agency.nameTh : agency.nameEn}
                </span>
                {source ? (
                  <span className="mt-auto">
                    <SourceBadge kind={source.kind} />
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
