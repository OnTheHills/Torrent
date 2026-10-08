"use client";

import { useEffect, useState } from "react";

import {
  useNotificationPrefs,
  type NotificationPrefs,
} from "@/components/providers/notification-prefs-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { TorCategory } from "@/types/tor";

const FROST_PANEL =
  "rounded-lg bg-[color-mix(in_srgb,var(--palette-gray-50)_62%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] backdrop-blur-md backdrop-saturate-150";

const CATEGORIES: TorCategory[] = [
  "Software Development",
  "Web Application",
  "Mobile Application",
  "Data Platform",
  "Digital Platform",
  "AI / Analytics",
  "Cybersecurity",
  "GIS",
  "Others",
];

export function NotificationSettingsView() {
  const { t } = useLocale();
  const { prefs, setPrefs, ready } = useNotificationPrefs();
  const [draft, setDraft] = useState<NotificationPrefs>(prefs);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!ready) return;

    const timer = window.setTimeout(() => {
      setDraft(prefs);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [ready, prefs]);

  const update = (patch: Partial<NotificationPrefs>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const toggleCategory = (category: TorCategory) => {
    const next = draft.categories.includes(category)
      ? draft.categories.filter((item) => item !== category)
      : [...draft.categories, category];
    update({ categories: next });
  };

  const handleSave = () => {
    setPrefs(draft);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden hero-atmosphere text-hero-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(144px+2rem)] sm:px-6 md:pb-12 md:pt-[calc(144px+3rem)]">
          <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
              {t("settingsTitle")}
            </h1>
            <p className="mt-5 text-base leading-[1.7] text-hero-muted md:text-lg">
              {t("settingsDescription")}
            </p>
          </div>
        </div>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-12 sm:px-6 md:py-16">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className={FROST_PANEL}>
          <CardHeader className="border-b border-border pb-5">
            <CardTitle className="text-lg">{t("emailNotifications")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {(
              [
                ["emailMatches", "emailMatchesLabel"],
                ["emailDeadlines", "emailDeadlinesLabel"],
                ["emailIntegrity", "emailIntegrityLabel"],
              ] as const
            ).map(([key, labelKey]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <label htmlFor={key} className="text-sm leading-snug">
                  {t(labelKey)}
                </label>
                <Switch
                  id={key}
                  checked={draft[key]}
                  disabled={!ready}
                  onCheckedChange={(checked) => update({ [key]: checked })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={FROST_PANEL}>
          <CardHeader className="border-b border-border pb-5">
            <CardTitle className="text-lg">{t("budgetInterest")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="budgetMin" className="text-xs text-muted-foreground">
                {t("budgetMin")}
              </label>
              <Input
                id="budgetMin"
                type="number"
                min={0}
                step={100000}
                value={draft.budgetMinThb}
                disabled={!ready}
                onChange={(event) =>
                  update({ budgetMinThb: Number(event.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="budgetMax" className="text-xs text-muted-foreground">
                {t("budgetMax")}
              </label>
              <Input
                id="budgetMax"
                type="number"
                min={0}
                step={100000}
                value={draft.budgetMaxThb}
                disabled={!ready}
                onChange={(event) =>
                  update({ budgetMaxThb: Number(event.target.value) || 0 })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={FROST_PANEL}>
        <CardHeader className="border-b border-border pb-5">
          <CardTitle className="text-lg">{t("categoriesInterest")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-5">
          {CATEGORIES.map((category) => {
            const selected = draft.categories.includes(category);
            return (
              <button
                key={category}
                type="button"
                disabled={!ready}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {selected ? "✓ " : ""}
                {category}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="lg" disabled={!ready} onClick={handleSave}>
          {t("saveSettings")}
        </Button>
        {savedFlash ? (
          <p className="text-sm font-medium text-emerald-300">
            {t("settingsSaved")}
          </p>
        ) : null}
      </div>
      </div>
    </div>
  );
}
