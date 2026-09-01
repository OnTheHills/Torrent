"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Toggle } from "@/components/ui/toggle";
import type { Locale } from "@/lib/i18n/dictionary";

const LOCALE_OPTIONS = [
  { value: "th" as const, label: "TH", ariaLabel: "ภาษาไทย" },
  { value: "en" as const, label: "EN", ariaLabel: "English" },
];

export function LocaleToggle({
  className,
  tone,
}: {
  className?: string;
  tone?: "default" | "chrome";
}) {
  const { locale, setLocale } = useLocale();

  return (
    <Toggle
      aria-label="Language"
      value={locale}
      onValueChange={(value: Locale) => setLocale(value)}
      options={LOCALE_OPTIONS}
      className={className}
      tone={tone}
    />
  );
}
