import { fetchTorsForQuery } from "@/lib/api";

/** Shared React Query key for the full TOR catalog. */
export const TORS_QUERY_KEY = ["tors"] as const;

/**
 * The /tors payload is large (~thousands of rows). Keep it fresh for a minute so
 * navigating to Listings (or remounting TorBrowse) does not re-download every click.
 */
export const TORS_STALE_TIME_MS = 60_000;

export const torsQueryOptions = {
  queryKey: TORS_QUERY_KEY,
  queryFn: fetchTorsForQuery,
  staleTime: TORS_STALE_TIME_MS,
  gcTime: 10 * 60_000,
  retry: 30,
  retryDelay: (attempt: number) => Math.min(1_000 * 2 ** attempt, 5_000),
} as const;
