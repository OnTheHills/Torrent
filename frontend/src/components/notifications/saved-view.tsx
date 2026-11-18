"use client";

import { ShellContent } from "@/components/layout/shell-content";
import Link from "next/link";
import { HeartIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";

import { HeroTitle } from "@/components/layout/hero-title";
import { useLocale } from "@/components/providers/locale-provider";
import { useSaved } from "@/components/providers/saved-provider";
import { ListingFrostCard } from "@/components/tor/listing-frost-card";
import { TorFetchStatus } from "@/components/tor/tor-loading";
import { useTorsWithMatches } from "@/components/tor/use-match-scores";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { torsQueryOptions } from "@/lib/tors-query";

export function SavedView() {
  const { t } = useLocale();
  const { savedIds, ready } = useSaved();
  const { data: sourceTors = [], isPending } = useQuery(torsQueryOptions);
  const tors = useTorsWithMatches(sourceTors, true);

  const savedTors = tors
    .filter((tor) => savedIds.includes(tor.id))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const loading = isPending || !ready;

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden text-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden bg-[#f3bdd0]"
        >
          <div className="potion-wash" />
          <div className="potion-blob potion-orbit top-[-28%] left-[-16%] bg-[radial-gradient(ellipse_at_center,#eea4c2_0%,transparent_70%)]" />
          <div className="potion-blob potion-shear top-[-8%] right-[-22%] bg-[radial-gradient(ellipse_at_center,#e7a0bc_0%,transparent_68%)] [animation-delay:-6s]" />
          <div className="potion-blob potion-rise bottom-[-36%] left-[12%] bg-[radial-gradient(ellipse_at_center,#f7cddd_0%,transparent_70%)] [animation-delay:-9s]" />
          <div className="potion-blob potion-orbit top-[8%] left-[34%] bg-[radial-gradient(ellipse_at_center,#f0b4cb_0%,transparent_66%)] [animation-delay:-11s] [animation-direction:reverse]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-16 bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--background)_40%,transparent)_55%,var(--background)_100%)] md:h-20"
        />
        <ShellContent className="relative z-10">
          <div className="relative mx-auto flex max-w-6xl flex-col justify-start px-4 pb-10 pt-[calc(144px+2.5rem)] sm:px-6 md:pb-12 md:pt-[calc(144px+3.5rem)]">
            <div className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl">
              <HeroTitle
                icon={<HugeiconsIcon icon={HeartIcon} strokeWidth={1.75} />}
              >
                {t("savedTitle")}
              </HeroTitle>
              <p className="mt-5 text-base leading-[1.7] text-muted-foreground md:text-lg">
                {t("savedDescription")}
              </p>
            </div>
          </div>
        </ShellContent>
      </section>

      <ShellContent>
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-12 pt-4 sm:px-6 md:pb-16 md:pt-6">
          {!loading && savedTors.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">
                {savedTors.length}
              </span>{" "}
              {t("results")}
            </p>
          ) : null}

          {loading ? (
            <div className="flex flex-col gap-4">
              <TorFetchStatus />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="h-64 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--palette-gray-50)_62%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] motion-reduce:animate-none"
                  />
                ))}
              </div>
            </div>
          ) : savedTors.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-lg bg-[color-mix(in_srgb,var(--palette-gray-50)_62%,transparent)] px-6 py-16 text-center shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] backdrop-blur-md backdrop-saturate-150">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,#f7b6cf_72%,transparent)] text-[#e44586] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,#f4a0c0_90%,transparent)] backdrop-blur-md backdrop-saturate-150">
                <HugeiconsIcon icon={HeartIcon} strokeWidth={1.75} className="size-6 [&_path]:fill-[#e44586]" />
              </span>
              <div className="space-y-1.5">
                <p className="text-lg font-semibold tracking-tight">{t("savedEmpty")}</p>
                <p className="text-sm text-muted-foreground">{t("savedEmptyHint")}</p>
              </div>
              <Button asChild variant="orange">
                <Link href={routes.app.tors}>{t("browseTors")}</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {savedTors.map((tor) => (
                <ListingFrostCard key={tor.id} tor={tor} />
              ))}
            </div>
          )}
        </div>
      </ShellContent>
    </div>
  );
}
