"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { TorCategory } from "@/types/tor";

const STORAGE_KEY = "torrent-notification-prefs";

export type NotificationPrefs = {
  emailMatches: boolean;
  emailDeadlines: boolean;
  emailIntegrity: boolean;
  budgetMinThb: number;
  budgetMaxThb: number;
  categories: TorCategory[];
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  emailMatches: true,
  emailDeadlines: true,
  emailIntegrity: false,
  budgetMinThb: 1_000_000,
  budgetMaxThb: 20_000_000,
  categories: ["Web Application", "AI / Analytics"],
};

type PrefsContextValue = {
  prefs: NotificationPrefs;
  setPrefs: (next: NotificationPrefs) => void;
  updatePrefs: (patch: Partial<NotificationPrefs>) => void;
  ready: boolean;
};

const PrefsContext = createContext<PrefsContextValue | null>(null);

function readPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export function NotificationPrefsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [prefs, setPrefsState] = useState<NotificationPrefs>(
    DEFAULT_NOTIFICATION_PREFS
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefsState(readPrefs());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs, ready]);

  const setPrefs = useCallback((next: NotificationPrefs) => {
    setPrefsState(next);
  }, []);

  const updatePrefs = useCallback((patch: Partial<NotificationPrefs>) => {
    setPrefsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ prefs, setPrefs, updatePrefs, ready }),
    [prefs, setPrefs, updatePrefs, ready]
  );

  return (
    <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
  );
}

export function useNotificationPrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) {
    throw new Error(
      "useNotificationPrefs must be used within NotificationPrefsProvider"
    );
  }
  return ctx;
}
