"use client";

import Image from "next/image";

import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: { className: "h-7 w-auto md:h-9", width: 180, height: 40 },
  md: { className: "h-10 w-auto", width: 220, height: 48 },
  lg: { className: "h-12 w-auto md:h-14", width: 320, height: 72 },
  xl: { className: "h-14 w-auto md:h-20", width: 400, height: 90 },
  xxl: { className: "h-16 w-auto md:h-24", width: 480, height: 108 },
  xxxl: { className: "h-20 w-auto md:h-28", width: 560, height: 126 },
  xxxxl: { className: "h-24 w-auto md:h-32", width: 640, height: 144 },
} as const;

/**
 * Official ThaiTORRENT lockup from /public.
 * `logo_dark` is light-on-dark; `logo_light` is dark-on-light.
 * `onDark` uses the light-on-dark mark (app bar / sidebar chrome).
 */
export function BrandLockup({
  className,
  size = "sm",
  priority = false,
  onDark = false,
}: {
  className?: string;
  size?: keyof typeof SIZE;
  priority?: boolean;
  onDark?: boolean;
}) {
  const { t } = useLocale();
  const dim = SIZE[size];

  return (
    <Image
      src={onDark ? "/logo_dark.png" : "/logo_light.png"}
      alt={t("brand")}
      width={dim.width}
      height={dim.height}
      className={cn(dim.className, className)}
      priority={priority}
    />
  );
}
