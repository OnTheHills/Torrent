"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchMyMatchScores, fetchPendingMatchIds } from "@/lib/api";
import { fitScoreApplies } from "@/lib/listing-stage";
import type { Tor } from "@/types/tor";

export function useTorsWithMatches(tors: Tor[], enabled: boolean) {
  const pendingQuery = useQuery({
    queryKey: ["tor-matches", "pending"],
    queryFn: fetchPendingMatchIds,
    enabled,
    staleTime: 15_000,
    refetchInterval: (query) =>
      Array.isArray(query.state.data) && query.state.data.length > 0 ? 15_000 : false,
  });
  const pendingIds = pendingQuery.data ?? [];
  const { data: scores = {} } = useQuery({
    queryKey: ["tor-matches", "mine"],
    queryFn: fetchMyMatchScores,
    enabled,
    staleTime: 15_000,
    refetchInterval: pendingIds.length > 0 ? 15_000 : false,
  });
  const pending = useMemo(() => new Set(pendingIds), [pendingIds]);

  return useMemo(() => {
    if (!enabled) return tors;
    return tors.map((tor) => {
      const score = scores[tor.id];
      if (score && typeof score.score === "number") {
        return {
          ...tor,
          matchScore: score.score,
          ...(score.reason.trim() ? { matchInsight: score.reason } : {}),
        };
      }
      if (pending.has(tor.id)) return { ...tor, matchPending: true };
      return tor;
    });
  }, [enabled, pending, scores, tors]);
}
