"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "torrent-saved-tors";

type SavedContextValue = {
  savedIds: string[];
  isSaved: (torId: string) => boolean;
  toggleSaved: (torId: string) => void;
  removeSaved: (torId: string) => void;
  ready: boolean;
};

const SavedContext = createContext<SavedContextValue | null>(null);

function readSaved(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSavedIds(readSaved());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedIds));
    } catch {
      /* ignore quota */
    }
  }, [ready, savedIds]);

  const isSaved = useCallback(
    (torId: string) => savedIds.includes(torId),
    [savedIds]
  );

  const toggleSaved = useCallback((torId: string) => {
    setSavedIds((prev) =>
      prev.includes(torId) ? prev.filter((id) => id !== torId) : [...prev, torId]
    );
  }, []);

  const removeSaved = useCallback((torId: string) => {
    setSavedIds((prev) => prev.filter((id) => id !== torId));
  }, []);

  const value = useMemo(
    () => ({ savedIds, isSaved, toggleSaved, removeSaved, ready }),
    [savedIds, isSaved, toggleSaved, removeSaved, ready]
  );

  return (
    <SavedContext.Provider value={value}>{children}</SavedContext.Provider>
  );
}

export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) {
    throw new Error("useSaved must be used within SavedProvider");
  }
  return ctx;
}
