"use client";

import { useEffect, useState } from "react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  useNotificationPrefs,
  type NotificationPrefs,
} from "@/components/providers/notification-prefs-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { categoryTone } from "@/components/tor/listing-badges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  getLineStatus,
  setLineDigest,
  startLineLink,
  unlinkLine,
  type LineStatus,
} from "@/lib/line";
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
  const [lineStatus, setLineStatus] = useState<LineStatus | null>(null);
  const [lineBusy, setLineBusy] = useState(false);
  const [lineError, setLineError] = useState("");

  useEffect(() => {
    if (!ready) return;

    const timer = window.setTimeout(() => {
      setDraft(prefs);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [ready, prefs]);

  useEffect(() => {
    let cancelled = false;
    void getLineStatus()
      .then((status) => {
        if (!cancelled) setLineStatus(status);
      })
      .catch(() => {
        if (!cancelled) setLineStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const runLineAction = async (action: () => Promise<LineStatus>) => {
    setLineBusy(true);
    setLineError("");
    try {
      const status = await action();
      setLineStatus(status);
    } catch (error) {
      setLineError(
        error instanceof Error ? error.message : "LINE request failed",
      );
    } finally {
      setLineBusy(false);
    }
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
      <Card className={FROST_PANEL}>
        <CardHeader className="border-b border-border pb-5">
          <CardTitle className="text-lg">{t("lineNotifications")}</CardTitle>
          <CardDescription className="pt-2 text-sm leading-relaxed">
            {t("lineNotificationsHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {lineStatus?.linked ? t("lineConnected") : t("lineNotConnected")}
            </p>
            <div className="flex flex-wrap gap-2">
              {lineStatus?.linked ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={lineBusy}
                  onClick={() => void runLineAction(unlinkLine)}
                >
                  {lineBusy ? t("lineBusy") : t("lineDisconnect")}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={lineBusy}
                  onClick={() => void runLineAction(startLineLink)}
                >
                  {lineBusy ? t("lineBusy") : t("lineConnect")}
                </Button>
              )}
              {lineStatus?.oaAddUrl ? (
                <Button type="button" variant="outline" size="sm" asChild>
                  <a
                    href={lineStatus.oaAddUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("lineOpenOa")}
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          {!lineStatus?.linked && lineStatus?.pendingCode ? (
            <div className="rounded-md bg-[color-mix(in_srgb,white_72%,transparent)] px-4 py-3 ring-1 ring-[color-mix(in_srgb,var(--palette-gray-900)_8%,transparent)]">
              <p className="text-sm text-muted-foreground">{t("lineCodeHint")}</p>
              <p className="mt-2 font-mono text-2xl font-semibold tracking-[0.2em]">
                {lineStatus.pendingCode}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("lineCodeExpires")}
              </p>
            </div>
          ) : null}

          {lineStatus?.linked ? (
            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <label htmlFor="lineDigest" className="text-sm leading-snug">
                {t("lineDigestLabel")}
              </label>
              <Switch
                id="lineDigest"
                checked={Boolean(lineStatus.digestEnabled)}
                disabled={lineBusy}
                onCheckedChange={(checked) =>
                  void runLineAction(() => setLineDigest(checked))
                }
              />
            </div>
          ) : null}

          {lineError ? (
            <p className="text-sm text-destructive" role="alert">
              {lineError}
            </p>
          ) : null}
        </CardContent>
      </Card>

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
            const tone = categoryTone(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={selected}
                disabled={!ready}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium",
                  "shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] backdrop-blur-md backdrop-saturate-150",
                  "ring-1 transition-[background-color,transform] duration-200 ease-out",
                  "hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60",
                  "motion-reduce:transition-none motion-reduce:hover:transform-none",
                  selected
                    ? cn(
                        tone.fill,
                        tone.text,
                        "ring-[color-mix(in_srgb,currentColor_28%,transparent)]",
                      )
                    : "bg-[color-mix(in_srgb,white_72%,transparent)] text-muted-foreground ring-[color-mix(in_srgb,var(--palette-gray-900)_10%,transparent)] hover:bg-[color-mix(in_srgb,white_88%,transparent)]",
                )}
              >
                {selected ? (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    strokeWidth={2.25}
                    className="size-3.5 shrink-0"
                  />
                ) : null}
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
