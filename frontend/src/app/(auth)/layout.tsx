import Link from "next/link";

import { HomeHeroTiles } from "@/components/home/home-hero-tiles";
import { BrandLockup } from "@/components/layout/brand-lockup";
import { routes } from "@/config/routes";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden hero-atmosphere text-hero-foreground">
      <HomeHeroTiles className="pointer-events-none absolute inset-0 z-0 opacity-95" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,transparent_10%,var(--palette-gray-900)_100%)]"
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-lg bg-[color-mix(in_srgb,var(--palette-gray-50)_72%,transparent)] p-6 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] backdrop-blur-md backdrop-saturate-150">
        <Link href={routes.home} className="mb-2 pr-4 flex items-center justify-center">
          <BrandLockup size="xl" priority />
        </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
