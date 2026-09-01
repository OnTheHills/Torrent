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
      <div className="pointer-events-none absolute inset-0 hero-rays opacity-50" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <Link href={routes.home} className="mb-8 inline-flex">
          <BrandLockup size="lg" priority />
        </Link>
        <div className="rounded-2xl border border-border/60 bg-surface-elevated p-6 shadow-lg backdrop-blur-md">
          {children}
        </div>
      </div>
    </div>
  );
}
