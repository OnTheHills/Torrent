"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { HomeSection } from "@/components/home/home-section";
import { BrandLockup } from "@/components/layout/brand-lockup";
import { useLocale } from "@/components/providers/locale-provider";
import { routes } from "@/config/routes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

/**
 * How data enters TORRENT — four source clouds around one hub.
 * Keep this honest: curated feeds + expanding e-GP department allowlist.
 *
 * Layering: left clouds behind the hub, right clouds in front (sketch).
 */
const FEEDS: {
  title: DictionaryKey;
  body: DictionaryKey;
  left: string;
  top: string;
  layer: "back" | "front";
  /** Extra top padding on the label stack (pushes copy down inside the cloud). */
  textNudge?: string;
}[] = [
  {
    title: "coverageFeedOcdsTitle",
    body: "coverageFeedOcdsBody",
    left: "6%",
    top: "24%",
    layer: "front",
    textNudge: "1.4rem",
  },
  {
    title: "coverageFeedEgp2Title",
    body: "coverageFeedEgp2Body",
    left: "54%",
    top: "22%",
    layer: "front",
    textNudge: "1.4rem",
  },
  {
    title: "coverageFeedRssTitle",
    body: "coverageFeedRssBody",
    left: "8%",
    top: "52%",
    layer: "front",
  },
  {
    title: "coverageFeedDataGoTitle",
    body: "coverageFeedDataGoBody",
    left: "52%",
    top: "52%",
    layer: "front",
    textNudge: "0.95rem",
  },
];

/** Public labels for the curated e-GP allowlist (see backend EGP_DEPT_IDS). */
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
  "inline-flex h-16 min-h-16 max-h-16 items-center gap-3 whitespace-nowrap rounded-lg border-0 bg-[rgb(255_255_255_/_0.88)] py-0 pl-3 pr-4 text-base font-medium leading-none text-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.95)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_55%,transparent)]";

/** Yellow frost — same recipe as tinted frost buttons (teal/orange/etc.). */
const frostHub =
  "border-0 bg-[color-mix(in_srgb,var(--palette-yellow-300)_42%,transparent)] text-[var(--palette-yellow-900)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_85%,transparent),0_8px_24px_rgb(0_0_0_/_0.05)] ring-1 ring-[color-mix(in_srgb,var(--palette-yellow-400)_50%,transparent)] backdrop-blur-md backdrop-saturate-150";

/** Flat white frame for the departments card. */
const deptsCard =
  "border-0 bg-white text-foreground ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_55%,transparent)]";

function FrostCloud({
  children,
  className,
  style,
  textNudge,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  textNudge?: string;
}) {
  return (
    <div className={cn("relative", className)} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cloud.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-contain drop-shadow-[0_12px_24px_rgb(80_130_180_/_0.28)] opacity-65"
        draggable={false}
      />
      <div
        className="relative z-10 flex h-full flex-col items-center justify-center gap-1.5 px-[18%] pb-[14%] pt-[20%] text-center"
        style={textNudge ? { paddingTop: `calc(20% + ${textNudge})` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

export function HomeCoverage() {
  const { locale, t } = useLocale();

  return (
    <HomeSection title={t("coverageTitle")} description={t("coverageBody")}>
      <div className="space-y-4">
        <div>
          {/* Desktop: big layered clouds around frost hub */}
          <div className="relative mx-auto mt-0 hidden aspect-square w-full max-w-4xl md:-mb-[29%] md:block">
            {/* Uniform nudge — change --constellation-nudge-y to move everything equally. */}
            <div
              className="absolute inset-0"
              style={{ transform: "translateY(var(--constellation-nudge-y, -18%))" }}
            >
              {FEEDS.map((feed, index) => (
                <FrostCloud
                  key={feed.title}
                  textNudge={feed.textNudge}
                  className={cn(
                    "absolute aspect-[927/549] w-[38%]",
                    feed.layer === "back" ? "z-[1]" : "z-30",
                    "motion-safe:animate-[hero-tile-in_800ms_cubic-bezier(0.22,1,0.36,1)_both]",
                  )}
                  style={{
                    left: feed.left,
                    top: feed.top,
                    animationDelay: `${index * 80}ms`,
                  }}
                >
                  <p className="text-sm font-semibold leading-tight tracking-tight text-[var(--palette-teal-900)] lg:text-base">
                    {t(feed.title)}
                  </p>
                  <p className="text-xs leading-[1.45] text-[var(--palette-teal-900)]/70 lg:text-[0.8rem]">
                    {t(feed.body)}
                  </p>
                </FrostCloud>
              ))}

              <div
                className={cn(
                  "absolute left-1/2 top-1/2 z-20 flex aspect-square w-[34%] max-w-[17rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
                  frostHub,
                )}
              >
                <BrandLockup size="md" className="h-16 w-auto max-w-[70%] object-contain lg:h-18" />
              </div>
            </div>
          </div>

          {/* Mobile: hub first, then cloud stack */}
          <div className="mt-5 space-y-3 md:hidden">
            <div
              className={cn(
                "mx-auto flex size-28 items-center justify-center rounded-full",
                frostHub,
              )}
            >
              <BrandLockup size="sm" className="h-8 w-auto max-w-[70%] object-contain" />
            </div>
            <ul className="grid gap-2">
              {FEEDS.map((feed) => (
                <li key={feed.title}>
                  <FrostCloud className="mx-auto aspect-[927/549] w-full max-w-sm">
                    <p className="text-sm font-semibold leading-tight tracking-tight text-[var(--palette-teal-900)]">
                      {t(feed.title)}
                    </p>
                    <p className="text-xs leading-[1.45] text-[var(--palette-teal-900)]/70">
                      {t(feed.body)}
                    </p>
                  </FrostCloud>
                </li>
              ))}
            </ul>
          </div>
        </div>

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
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-foreground",
                "bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)]",
                "backdrop-blur-md backdrop-saturate-150 transition-[transform,filter] duration-200 ease-out",
                "hover:-translate-y-0.5 hover:brightness-[1.02]",
                "motion-reduce:transition-none motion-reduce:hover:transform-none",
              )}
            >
              {t("browseTors")}
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
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
