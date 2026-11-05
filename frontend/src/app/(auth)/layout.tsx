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
    <div
      className="relative min-h-screen overflow-hidden text-foreground"
      style={{
        backgroundImage:
          "linear-gradient(165deg, var(--palette-black) 0%, var(--palette-gray-900) 38%, var(--palette-teal-900) 72%, #060d14 100%)",
      }}
    >
      <HomeHeroTiles
        glow
        className="pointer-events-none absolute inset-0 z-0 opacity-95"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,transparent_35%,color-mix(in_srgb,var(--palette-black)_88%,transparent)_100%)]"
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <Link href={routes.home} className="mb-8 inline-flex">
          <BrandLockup size="lg" priority onDark />
        </Link>
        <div className="rounded-lg bg-[color-mix(in_srgb,var(--palette-gray-50)_72%,transparent)] p-6 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] backdrop-blur-md backdrop-saturate-150">
          {children}
        </div>
      </div>
    </div>
  );
}
