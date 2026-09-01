"use client";

import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Briefcase01Icon,
  GlobeIcon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";

import { HomeSection } from "@/components/home/home-section";
import { useLocale } from "@/components/providers/locale-provider";
import { routes } from "@/config/routes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

const ROLES: {
  title: DictionaryKey;
  body: DictionaryKey;
  cta: DictionaryKey;
  href: string;
  icon: IconSvgElement;
  emphasis?: boolean;
}[] = [
  {
    title: "rolePublicTitle",
    body: "rolePublicBody",
    cta: "openMonitor",
    href: routes.monitor,
    icon: GlobeIcon,
    emphasis: true,
  },
  {
    title: "roleVendorTitle",
    body: "roleVendorBody",
    cta: "vendorSignIn",
    href: routes.login,
    icon: Briefcase01Icon,
    emphasis: true,
  },
  {
    title: "roleOperatorTitle",
    body: "roleOperatorBody",
    cta: "forOperators",
    href: routes.admin.home,
    icon: Shield01Icon,
  },
];

export function HomeRoles() {
  const { t } = useLocale();

  return (
    <HomeSection
      eyebrow={t("rolesEyebrow")}
      title={t("rolesTitle")}
      description={t("rolesSubtitle")}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {ROLES.map((role) => (
          <Link
            key={role.title}
            href={role.href}
            className={cn(
              "group flex h-full flex-col gap-4 rounded-[8px] p-6 ring-1 transition-colors",
              role.emphasis
                ? "bg-card ring-foreground/10 hover:ring-primary/40"
                : "bg-muted/40 ring-transparent hover:ring-foreground/10"
            )}
          >
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-[8px]",
                role.emphasis
                  ? "bg-[var(--palette-teal-100)]"
                  : "bg-[var(--palette-gray-100)]"
              )}
            >
              <HugeiconsIcon
                icon={role.icon}
                strokeWidth={1.75}
                className={cn(
                  "size-5",
                  role.emphasis
                    ? "text-[var(--palette-teal-700)]"
                    : "text-[var(--palette-gray-700)]"
                )}
              />
            </span>
            <div className="space-y-2">
              <h3 className="text-base font-semibold tracking-tight">{t(role.title)}</h3>
              <p className="text-sm leading-[1.7] text-muted-foreground">{t(role.body)}</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
              {t(role.cta)}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        ))}
      </div>
    </HomeSection>
  );
}
