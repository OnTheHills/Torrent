"use client";

import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Briefcase01Icon,
  GlobeIcon,
} from "@hugeicons/core-free-icons";

import { HomeSection } from "@/components/home/home-section";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FrostCard } from "@/components/ui/frost-card";
import { FrostPillMark } from "@/components/ui/frost-pill";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";
import { routes } from "@/config/routes";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const ROLES: {
  title: DictionaryKey;
  body: DictionaryKey;
  cta: DictionaryKey;
  href: string;
  icon: IconSvgElement;
  iconBg: string;
  iconFg: string;
  iconRing: string;
}[] = [
  {
    title: "rolePublicTitle",
    body: "rolePublicBody",
    cta: "openMonitor",
    href: routes.monitor,
    icon: GlobeIcon,
    iconBg: "bg-[var(--palette-teal-75)]",
    iconFg: "text-[var(--palette-teal-700)]",
    iconRing:
      "ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)]",
  },
  {
    title: "roleVendorTitle",
    body: "roleVendorBody",
    cta: "vendorSignIn",
    href: routes.login,
    icon: Briefcase01Icon,
    iconBg: "bg-[var(--palette-orange-75)]",
    iconFg: "text-[var(--palette-orange-700)]",
    iconRing:
      "ring-[color-mix(in_srgb,var(--palette-orange-400)_48%,transparent)]",
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
      <Surface className="space-y-4 bg-surface p-5 ring-transparent md:p-6">
        <ul className="grid gap-5 md:grid-cols-2">
          {ROLES.map((role) => (
            <FrostCard
              as="li"
              key={role.title}
              className="flex h-full flex-col gap-4 rounded-lg p-6 md:p-5"
            >
              <div className="flex items-center gap-3">
                <FrostPillMark
                  className={cn(
                    "size-10",
                    role.iconBg,
                    role.iconRing,
                    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)]",
                  )}
                >
                  <HugeiconsIcon
                    icon={role.icon}
                    strokeWidth={2}
                    className={`size-5 ${role.iconFg}`}
                  />
                </FrostPillMark>
                <h3 className="text-xl font-semibold tracking-tight">
                  {t(role.title)}
                </h3>
              </div>
              <p className="text-sm leading-[1.7] text-muted-foreground">
                {t(role.body)}
              </p>
              <Button asChild variant="outline" className="mt-auto w-fit">
                <Link href={role.href}>
                  {t(role.cta)}
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                </Link>
              </Button>
            </FrostCard>
          ))}
        </ul>
      </Surface>
    </HomeSection>
  );
}
