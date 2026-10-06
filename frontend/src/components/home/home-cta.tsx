"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { routes } from "@/config/routes";

const frostButton =
  "border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]";

const frostTealButton =
  "border-0 bg-[color-mix(in_srgb,var(--palette-teal-400)_32%,transparent)] text-[var(--palette-teal-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[color-mix(in_srgb,var(--palette-teal-400)_44%,transparent)]";

export function HomeCta() {
  const { t } = useLocale();

  return (
    <Surface
      as="section"
      className="flex flex-col gap-1 bg-surface p-5 ring-transparent md:p-6"
    >
      <div className="max-w-2xl space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[2rem] md:leading-[1.2]">
          {t("ctaTitle")}
        </h2>
        <p className="text-base leading-[1.7] text-muted-foreground">
          {t("ctaBody")}
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <Button asChild size="lg" className={frostTealButton}>
          <Link href={routes.tors}>
            {t("browseTors")}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Link>
        </Button>
        <Button asChild size="lg" className={frostButton}>
          <Link href={routes.register}>{t("ctaVendorProfile")}</Link>
        </Button>
      </div>
    </Surface>
  );
}
