"use client";


import { ShellContent } from "@/components/layout/shell-content";
import { useEffect, useRef, useState } from "react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { AlertsHero } from "@/components/notifications/alerts-hero";
import { useLocale } from "@/components/providers/locale-provider";
import { frostSelectedItem } from "@/components/tor/tor-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  getLineStatus,
  setLineDigest,
  startLineLink,
  unlinkLine,
  type LineStatus,
} from "@/lib/line";
import { api } from "@/lib/api";
import { TOR_CATEGORIES } from "@/lib/tor-categories";
import { cn } from "@/lib/utils";
import type { TorCategory } from "@/types/tor";

const settingsCard =
  "liquid-glass-card liquid-glass-card-static liquid-glass-card-clear rounded-2xl p-5 md:p-6";

function SettingsSectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <h2 className="text-2xl font-semibold tracking-tight md:text-[2rem] md:leading-[1.2]">
        {title}
      </h2>
      {description ? (
        <p className="text-base leading-[1.7] text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

type NotificationPrefs = {
  emailMatches: boolean;
  emailDeadlines: boolean;
  emailIntegrity: boolean;
  budgetMinThb: number;
  budgetMaxThb: number;
  categories: TorCategory[];
};

type EmailPrefsResponse = NotificationPrefs & { deliveryConfigured: boolean };

function LineCodeExpiry({ expiresAt }: { expiresAt: string }) {
  const { t } = useLocale();
  const expiresAtMs = Date.parse(expiresAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) return;

    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= expiresAtMs) window.clearInterval(timer);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expiresAtMs]);

  if (!Number.isFinite(expiresAtMs)) return null;

  const secondsLeft = Math.max(0, Math.ceil((expiresAtMs - now) / 1000));
  const timeLeft = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
      {secondsLeft > 0
        ? t("lineCodeExpires").replace("{time}", timeLeft)
        : t("lineCodeExpired")}
    </p>
  );
}

export function NotificationSettingsView() {
  const { t } = useLocale();
  const [draft, setDraft] = useState<NotificationPrefs>({
    emailMatches: false,
    emailDeadlines: false,
    emailIntegrity: false,
    budgetMinThb: 0,
    budgetMaxThb: 0,
    categories: [],
  });
  const [savedFlash, setSavedFlash] = useState(false);
  const [emailReady, setEmailReady] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailAvailable, setEmailAvailable] = useState(true);
  const [lineStatus, setLineStatus] = useState<LineStatus | null>(null);
  const [lineBusy, setLineBusy] = useState(false);
  const [lineError, setLineError] = useState("");
  const lineActionVersion = useRef(0);
  const lineActionPending = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void api<EmailPrefsResponse>("/email-alerts/preferences")
      .then((saved) => {
        if (cancelled) return;
        setEmailAvailable(saved.deliveryConfigured);
        setDraft(saved);
        setEmailReady(true);
      })
      .catch((error) => {
        if (!cancelled) setEmailError(error instanceof Error ? error.message : "Could not load email settings.");
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestVersion = lineActionVersion.current;
    void getLineStatus()
      .then((status) => {
        if (!cancelled && requestVersion === lineActionVersion.current) {
          setLineStatus(status);
        }
      })
      .catch(() => {
        if (!cancelled && requestVersion === lineActionVersion.current) {
          setLineStatus(null);
        }
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

  const handleSave = async () => {
    setEmailBusy(true);
    setEmailError("");
    try {
      const saved = await api<EmailPrefsResponse>("/email-alerts/preferences", {
        method: "PUT", body: JSON.stringify(draft),
      });
      setEmailAvailable(saved.deliveryConfigured);
      setDraft(saved);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Could not save email settings.");
    } finally {
      setEmailBusy(false);
    }
  };

  const runLineAction = async (action: () => Promise<LineStatus>) => {
    if (lineActionPending.current) return;
    lineActionPending.current = true;
    // A status request started before this click must not replace its result.
    lineActionVersion.current += 1;
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
      lineActionPending.current = false;
      setLineBusy(false);
    }
  };

  return (
    <div>
      <AlertsHero />

      <ShellContent>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
      <section className="space-y-6">
        <SettingsSectionHeading
          title={t("lineNotifications")}
          description={t("lineNotificationsHint")}
        />
        <div className={cn(settingsCard, "space-y-4")}>
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
              {lineStatus.pendingExpiresAt ? (
                <LineCodeExpiry
                  key={lineStatus.pendingExpiresAt}
                  expiresAt={lineStatus.pendingExpiresAt}
                />
              ) : null}
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
        </div>
      </section>

      <section className="space-y-6">
        <SettingsSectionHeading
          title={t("emailNotifications")}
          description={emailReady && !emailAvailable ? t("emailUnavailable") : undefined}
        />
        <div className={cn(settingsCard, "divide-y divide-border py-2 md:py-2")}>
          {(
            [
              ["emailMatches", "emailMatchesLabel"],
              ["emailDeadlines", "emailDeadlinesLabel"],
              ["emailIntegrity", "emailIntegrityLabel"],
            ] as const
          ).map(([key, labelKey]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 py-4"
            >
              <label htmlFor={key} className="text-sm leading-snug">
                {t(labelKey)}
              </label>
              <Switch
                id={key}
                checked={draft[key]}
                disabled={!emailReady || emailBusy}
                onCheckedChange={(checked) => update({ [key]: checked })}
              />
            </div>
          ))}

          <div className="space-y-3 py-5">
            <p className="text-sm font-medium">{t("budgetInterest")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
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
                  disabled={!emailReady || emailBusy}
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
                  disabled={!emailReady || emailBusy}
                  onChange={(event) =>
                    update({ budgetMaxThb: Number(event.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-5 pb-3">
            <p className="text-sm font-medium">{t("categoriesInterest")}</p>
            <div className="flex flex-wrap gap-2">
              {TOR_CATEGORIES.map((category) => {
                const selected = draft.categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={selected}
                    disabled={!emailReady || emailBusy}
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium",
                      "transition-[background-color,transform] duration-200 ease-out",
                      "hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60",
                      "motion-reduce:transition-none motion-reduce:hover:transform-none",
                      selected
                        ? frostSelectedItem
                        : "bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-sidebar-hover",
                    )}
                  >
                    {selected ? (
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        strokeWidth={2.25}
                        className="size-3.5 shrink-0 text-foreground"
                      />
                    ) : null}
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-row-reverse flex-wrap items-center gap-3">
        <Button type="button" size="lg" disabled={!emailReady || emailBusy} onClick={() => void handleSave()}>
          {t("saveSettings")}
        </Button>
        {savedFlash ? (
          <p className="text-sm font-medium text-emerald-300">
            {t("settingsSaved")}
          </p>
        ) : null}
        {emailError ? <p className="text-sm text-destructive" role="alert">{emailError}</p> : null}
      </div>
      </div>
      </ShellContent>
    </div>
  );
}
