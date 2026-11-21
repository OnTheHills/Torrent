"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/components/providers/session-provider";
import { api } from "@/lib/api";

type Watchlist = { savedIds: string[] };
type Change = { userId: string; torId: string; saved: boolean };
const watchlistKey = (userId?: string) => ["watchlist", userId] as const;

type SavedContextValue = {
  savedIds: string[];
  isSaved: (torId: string) => boolean;
  toggleSaved: (torId: string) => void;
  removeSaved: (torId: string) => void;
  ready: boolean;
  saving: boolean;
  error: Error | null;
  retry: () => void;
};

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const userId = user?._id;
  const client = useQueryClient();
  const query = useQuery({
    queryKey: watchlistKey(userId),
    enabled: Boolean(userId) && !loading,
    queryFn: ({ signal }) => api<Watchlist>("/users/me/watchlist", {
      cache: "no-store", signal, headers: { "x-watchlist-owner": userId! },
    }),
    retry: 1,
    staleTime: 0,
  });
  const mutation = useMutation({
    mutationKey: watchlistKey(userId),
    mutationFn: ({ userId: owner, torId, saved }: Change) => api<Watchlist>(
      `/users/me/watchlist/${encodeURIComponent(torId)}`,
      { method: saved ? "PUT" : "DELETE", headers: { "x-watchlist-owner": owner } },
    ),
    onSuccess: (result, change) => {
      // Late responses update only the account that initiated the request.
      client.setQueryData(watchlistKey(change.userId), result);
      void client.invalidateQueries({ queryKey: watchlistKey(change.userId), exact: true });
    },
  });
  // Never import the old browser-wide localStorage list: its owner is unknown.
  const savedIds = useMemo(() => userId ? query.data?.savedIds ?? [] : [], [userId, query.data]);
  const ready = Boolean(userId) && !loading && query.isSuccess;
  const isSaved = useCallback((torId: string) => savedIds.includes(torId), [savedIds]);
  const { mutate, isPending: saving } = mutation;
  const toggleSaved = useCallback((torId: string) => {
    if (userId && ready && !saving) mutate({ userId, torId, saved: !savedIds.includes(torId) });
  }, [userId, ready, saving, savedIds, mutate]);
  const removeSaved = useCallback((torId: string) => {
    if (userId && ready && !saving) mutate({ userId, torId, saved: false });
  }, [userId, ready, saving, mutate]);
  const { refetch } = query;
  const retry = useCallback(() => { void refetch(); }, [refetch]);
  const value = useMemo(() => ({
    savedIds, isSaved, toggleSaved, removeSaved, ready, saving,
    error: query.error, retry,
  }), [savedIds, isSaved, toggleSaved, removeSaved, ready, saving, query.error, retry]);

  return (
    <SavedContext.Provider value={value}>
      {children}
      {mutation.isError && mutation.variables?.userId === userId ? (
        <div role="alert" className="fixed bottom-6 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-4 rounded-lg border bg-background px-4 py-3 text-sm text-destructive shadow-lg">
          {mutation.error.message}
          <button type="button" onClick={() => mutation.reset()} aria-label="Dismiss watchlist error">×</button>
        </div>
      ) : null}
    </SavedContext.Provider>
  );
}

export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error("useSaved must be used within SavedProvider");
  return ctx;
}
