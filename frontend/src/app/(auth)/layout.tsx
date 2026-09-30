import Link from "next/link";

import { BrandLockup } from "@/components/layout/brand-lockup";
import { Surface } from "@/components/ui/surface";
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
        <Surface tone="elevated" className="p-6">
          {children}
        </Surface>
      </div>
    </div>
  );
}
