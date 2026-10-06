"use client";

import Image from "next/image";
import Link from "next/link";

import { HomeSection } from "@/components/home/home-section";
import { useLocale } from "@/components/providers/locale-provider";
import { SourceBadge } from "@/components/tor/source-badge";
import { FrostCard } from "@/components/ui/frost-card";
import { Surface } from "@/components/ui/surface";
import { AGENCIES } from "@/config/agencies";
import { listingsHref } from "@/config/routes";

export function HomeCoverage() {
  const { locale, t } = useLocale();

  return (
    <HomeSection
      eyebrow={t("coverageEyebrow")}
      title={t("coverageTitle")}
      description={t("coverageBody")}
    >
      <Surface className="space-y-4 bg-surface p-5 ring-transparent md:p-6">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {AGENCIES.map((agency) => (
            <li key={agency.id}>
              <FrostCard
                asChild
                className="relative flex h-full flex-col gap-2 rounded-lg p-4 transition-transform duration-200 ease-out hover:z-10 hover:-translate-y-1 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:transform-none md:p-5"
              >
                <Link href={listingsHref(agency.id)}>
                  <span className="flex items-center gap-3">
                    {agency.logo ? (
                      <Image
                        src={agency.logo}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-[8px] object-cover"
                      />
                    ) : null}
                    <span className="text-2xl font-semibold tracking-tight">
                      {locale === "th" ? agency.shortTh : agency.shortEn}
                    </span>
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {locale === "th" ? agency.nameTh : agency.nameEn}
                  </span>
                  {agency.sources.length > 0 ? (
                    <span className="mt-auto flex flex-wrap gap-1.5 pt-3">
                      {agency.sources.map((source) => (
                        <SourceBadge key={source.kind} kind={source.kind} />
                      ))}
                    </span>
                  ) : null}
                </Link>
              </FrostCard>
            </li>
          ))}
        </ul>
      </Surface>
    </HomeSection>
  );
}
