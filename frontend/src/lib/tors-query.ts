import { fetchTorsForQuery } from "@/lib/api";

/** Shared React Query key for the full TOR catalog. */
export const TORS_QUERY_KEY = ["tors"] as const;

/**
 * The /tors payload is large (~thousands of rows). Keep it warm for a few minutes
 * so HMR remounts and sidebar navigations reuse cache instead of re-downloading.
 */
export const TORS_STALE_TIME_MS = 5 * 60_000;

export const torsQueryOptions = {
  queryKey: TORS_QUERY_KEY,
  queryFn: fetchTorsForQuery,
  staleTime: TORS_STALE_TIME_MS,
  gcTime: 30 * 60_000,
  retry: 2,
  retryDelay: (attempt: number) => Math.min(1_000 * 2 ** attempt, 5_000),
} as const;
