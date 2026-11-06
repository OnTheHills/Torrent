"use client";

import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { HomeSection } from "@/components/home/home-section";
import { useLocale } from "@/components/providers/locale-provider";
import { chromeFrostGlazeDim } from "@/components/ui/appbar";
import { routes } from "@/config/routes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

/** Frost sheet inside the folder — same chrome as workflow cards. */
const frostPaper =
  "border-0 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent),0_6px_18px_rgb(0_0_0_/_0.05)] ring-1 backdrop-blur-xl backdrop-saturate-150";

/** Vintage kraft folder shell — same brown on every folder. */
const folderBack =
  "bg-[linear-gradient(165deg,#c4a878_0%,#d0b68a_55%,#c8ab7d_100%)]";
const folderFront =
  "bg-[linear-gradient(180deg,#f0dfc0_0%,#e8d4b0_48%,#dfc6a0_100%)]";

/**
 * How data enters TORRENT — four source folders.
 * Keep this honest: curated feeds + expanding e-GP department allowlist.
 */
const FEEDS: {
  title: DictionaryKey;
  body: DictionaryKey;
  /** Colored paper fill + ring. */
  paper: string;
}[] = [
  {
    title: "coverageFeedOcdsTitle",
    body: "coverageFeedOcdsBody",
    paper:
      "bg-[color-mix(in_srgb,var(--palette-green-300)_45%,transparent)] ring-[color-mix(in_srgb,var(--palette-green-400)_55%,transparent)]",
  },
  {
    title: "coverageFeedEgp2Title",
    body: "coverageFeedEgp2Body",
    paper:
      "bg-[color-mix(in_srgb,var(--palette-teal-400)_45%,transparent)] ring-[color-mix(in_srgb,var(--palette-teal-400)_55%,transparent)]",
  },
  {
    title: "coverageFeedRssTitle",
    body: "coverageFeedRssBody",
    paper:
      "bg-[color-mix(in_srgb,var(--palette-blue-300)_45%,transparent)] ring-[color-mix(in_srgb,var(--palette-blue-400)_55%,transparent)]",
  },
  {
    title: "coverageFeedDataGoTitle",
    body: "coverageFeedDataGoBody",
    paper:
      "bg-[color-mix(in_srgb,var(--palette-purple-300)_48%,transparent)] ring-[color-mix(in_srgb,var(--palette-purple-400)_50%,transparent)]",
  },
];

/**
 * Curated e-GP allowlist labels (see backend EGP_DEPT_IDS).
 * English short names verified against official agency branding.
 */
const DEPT_CHIPS: { labelEn: string; labelTh: string; logo: string }[] = [
  // National Cyber Security Agency
  { labelEn: "NCSA", labelTh: "สกมช.", logo: "/agency_logos/ncsa.png" },
  // Royal Irrigation Department
  {
    labelEn: "Royal Irrigation Department",
    labelTh: "ชลประทาน",
    logo: "/agency_logos/irrigation.svg",
  },
  // National Statistical Office
  { labelEn: "NSO", labelTh: "สสช.", logo: "/agency_logos/nso.svg" },
  // Digital Economy Promotion Agency (officially styled "depa")
  { labelEn: "depa", labelTh: "สศด.", logo: "/agency_logos/depa.png" },
  // Electronic Transactions Development Agency
  { labelEn: "ETDA", labelTh: "ETDA", logo: "/agency_logos/etda.svg" },
  // Digital Government Development Agency
  { labelEn: "DGA", labelTh: "สพร.", logo: "/agency_logos/dga.png" },
  // National Science and Technology Development Agency
  { labelEn: "NSTDA", labelTh: "สวทช.", logo: "/agency_logos/nstda.svg" },
  // Office of the Permanent Secretary, Ministry of Public Health
  {
    labelEn: "OPS, MoPH",
    labelTh: "สป.สธ.",
    logo: "/agency_logos/moph.svg",
  },
  // Department of Medical Services
  {
    labelEn: "Department of Medical Services",
    labelTh: "กรมการแพทย์",
    logo: "/agency_logos/medical-services.svg",
  },
  // Bank of Thailand
  {
    labelEn: "Bank of Thailand",
    labelTh: "ธปท.",
    logo: "/agency_logos/bot.svg",
  },
];

const frostChip =
  "inline-flex h-16 min-h-16 max-h-16 items-center gap-3 whitespace-nowrap rounded-lg border-0 bg-surface/30 py-0 pl-3 pr-4 text-base font-medium leading-none text-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.95)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_55%,transparent)]";

/** Flat white frame for the departments card. */
const deptsCard =
  "border-0 bg-white text-foreground ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_55%,transparent)]";

/**
 * Folder layers (back → front):
 * 1. kraft back
 * 2. colored paper (peeks above the front)
 * 3. kraft front
 */
function FeedFolder({
  title,
  body,
  paper,
}: {
  title: string;
  body: string;
  paper: string;
}) {
  return (
    <article className="relative flex h-full w-full flex-col pt-9 text-foreground">
      {/* Body stack: back kraft → colored paper → front kraft */}
      <div className="relative flex min-h-[9.5rem] flex-1 flex-col md:min-h-[10.5rem]">
        {/* 1. Back kraft — peeks at half the visible paper height */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-0 -top-4 bottom-0 z-0 rounded-md shadow-[0_14px_30px_rgb(0_0_0_/_0.14)]",
            folderBack,
          )}
        />

        {/* 2. Colored paper — reveals above the front (and above the back rim) */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-3 -top-8 z-10 h-[60%] rounded-sm sm:inset-x-4",
            frostPaper,
            paper,
          )}
        />

        {/* 3. Front kraft — covers the paper except the top-right peek */}
        <div
          className={cn(
            "relative z-20 flex flex-1 flex-col rounded-md px-5 pb-5 pt-6 shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.35)] ring-1 ring-[rgb(0_0_0_/_0.08)] md:px-6",
            folderFront,
          )}
        >
          <h3 className="text-lg font-semibold leading-tight tracking-tight md:text-xl">
            {title}
          </h3>
          <p className="mt-3 text-sm leading-[1.65] text-[color-mix(in_srgb,var(--palette-gray-900)_72%,transparent)]">
            {body}
          </p>
        </div>
      </div>
    </article>
  );
}

export function HomeCoverage() {
  const { locale, t } = useLocale();

  return (
    <HomeSection title={t("coverageTitle")} description={t("coverageBody")}>
      <div className="space-y-8 md:space-y-10">
        <ul className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {FEEDS.map((feed) => (
            <li key={feed.title} className="min-w-0 h-full">
              <FeedFolder
                title={t(feed.title)}
                body={t(feed.body)}
                paper={feed.paper}
              />
            </li>
          ))}
        </ul>

        <div className={cn("space-y-4 rounded-2xl p-5 md:p-6", deptsCard)}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 max-w-2xl space-y-2">
              <h3 className="text-base font-semibold tracking-tight">
                {t("coverageDeptsHeading")}
              </h3>
              <p className="text-base leading-[1.7] text-muted-foreground">
                {t("coverageDeptsBody")}
              </p>
            </div>
            <Link
              href={routes.tors}
              className={cn(
                chromeFrostGlazeDim,
                "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium",
                "transition-[transform,background] duration-200 ease-out",
                "hover:-translate-y-0.5",
                "motion-reduce:transition-none motion-reduce:hover:transform-none",
              )}
            >
              {t("browseTors")}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                className="size-4"
              />
            </Link>
          </div>
          <ul className="flex flex-wrap gap-3">
            {DEPT_CHIPS.map((chip) => {
              const label = locale === "th" ? chip.labelTh : chip.labelEn;
              return (
                <li key={chip.labelEn}>
                  <span className={frostChip}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={chip.logo}
                      alt=""
                      aria-hidden
                      className="size-11 shrink-0 rounded-full bg-white object-contain p-1.5 ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_40%,transparent)]"
                    />
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </HomeSection>
  );
}
