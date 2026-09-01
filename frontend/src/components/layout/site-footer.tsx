"use client";

import Link from "next/link";

import { BrandLockup } from "@/components/layout/brand-lockup";
import { useLocale } from "@/components/providers/locale-provider";
import { PUBLIC_NAV } from "@/config/navigation";
import { routes } from "@/config/routes";

export function SiteFooter() {
  const { t } = useLocale();

  return (
    <footer className="border-t border-border bg-muted/40">
      <div aria-hidden className="bma-stripes h-1 opacity-70" />
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <BrandLockup size="md" />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t("brandName")} — {t("footerTagline")}
          </p>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-foreground">
              {t("audiencePublic")}
            </p>
            {PUBLIC_NAV.flatMap((group) => group.items).map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-foreground">
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-foreground">
              {t("workspaces")}
            </p>
            <Link href={routes.login} className="hover:text-foreground">
              {t("forVendors")}
            </Link>
            <Link href={routes.admin.home} className="hover:text-foreground">
              {t("forOperators")}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
