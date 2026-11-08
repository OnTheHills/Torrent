"use client";

import { ShellContent } from "@/components/layout/shell-content";
import { useLocale } from "@/components/providers/locale-provider";
import { ListingsHero } from "@/components/tor/listings-hero";
import { Skeleton } from "@/components/ui/skeleton";

export function TorFetchStatus() {
  const { locale } = useLocale();

  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <span
        aria-hidden="true"
        className="size-4 rounded-full border-2 border-primary/25 border-t-primary motion-safe:animate-spin"
      />
      {locale === "th" ? "กำลังโหลดรายการ TOR…" : "Loading TOR listings…"}
    </p>
  );
}

export function TorLoading({ vendor = false }: { vendor?: boolean }) {
  return (
    <div aria-busy="true">
      <ListingsHero vendor={vendor} />
      <ShellContent>
        <div className="mx-auto max-w-screen-2xl space-y-6 px-4 pb-12 pt-6 sm:px-6 md:pb-16 md:pt-8">
          <TorFetchStatus />
          <div
            aria-hidden="true"
            className="space-y-3 motion-reduce:[&_*]:animate-none"
          >
            <Skeleton className="h-9 w-full sm:max-w-sm" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-52 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </ShellContent>
    </div>
  );
}
