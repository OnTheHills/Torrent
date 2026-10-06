import Link from "next/link";

import { BrandLockup } from "@/components/layout/brand-lockup";
import { routes } from "@/config/routes";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen hero-atmosphere">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <Link href={routes.home} className="mb-8 inline-flex">
          <BrandLockup size="lg" priority />
        </Link>
        <div className="rounded-lg bg-[color-mix(in_srgb,var(--palette-gray-50)_62%,transparent)] p-6 shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] backdrop-blur-md backdrop-saturate-150">
          {children}
        </div>
      </div>
    </div>
  );
}
