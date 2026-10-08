"use client";

import Link from "next/link";
import { HeartIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";

import { useLocale } from "@/components/providers/locale-provider";
import { useSaved } from "@/components/providers/saved-provider";
import { ListingFrostCard } from "@/components/tor/listing-frost-card";
import { TorFetchStatus } from "@/components/tor/tor-loading";
import { useTorsWithMatches } from "@/components/tor/use-match-scores";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { fetchTorsForQuery } from "@/lib/api";

export function SavedView() {
  const { t } = useLocale();
  const { savedIds, ready } = useSaved();
  const { data: sourceTors = [], isPending } = useQuery({
    queryKey: ["tors"],
    queryFn: fetchTorsForQuery,
  });
  const tors = useTorsWithMatches(sourceTors, true);

  const savedTors = tors
    .filter((tor) => savedIds.includes(tor.id))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const loading = isPending || !ready;

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden hero-atmosphere text-hero-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(144px+2rem)] sm:px-6 md:pb-12 md:pt-[calc(144px+3rem)]">
          <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
              {t("savedTitle")}
            </h1>
            <p className="mt-5 text-base leading-[1.7] text-hero-muted md:text-lg">
              {t("savedDescription")}
            </p>
          </div>
        </div>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:py-16">
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
    </div>
  );
}
