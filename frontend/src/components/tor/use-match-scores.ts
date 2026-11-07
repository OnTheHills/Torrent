"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  ensureTorMatchScores,
  fetchMyMatchScores,
  fetchPendingMatchIds,
} from "@/lib/api";
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
  const scoresQuery = useQuery({
    queryKey: ["tor-matches", "mine"],
    queryFn: fetchMyMatchScores,
    enabled,
    staleTime: 15_000,
    refetchInterval: pendingIds.length > 0 ? 15_000 : false,
  });
  const scores = scoresQuery.data ?? {};
  const pending = useMemo(() => new Set(pendingIds), [pendingIds]);
  const requested = useRef(new Set<string>());

  const missingScoreIds = useMemo(() => {
    if (!enabled || !scoresQuery.isFetched) return [];
    return tors
      .filter((tor) => fitScoreApplies(tor))
      .filter((tor) => !(tor.id in scores) && !pending.has(tor.id))
      .map((tor) => tor.id);
  }, [enabled, pending, scores, scoresQuery.isFetched, tors]);

  useEffect(() => {
    if (!enabled || !missingScoreIds.length) return;
    const fresh = missingScoreIds.filter((id) => !requested.current.has(id));
    if (!fresh.length) return;
    for (const id of fresh) requested.current.add(id);
    void ensureTorMatchScores(fresh).then(() => {
      void pendingQuery.refetch();
      void scoresQuery.refetch();
    });
  }, [enabled, missingScoreIds, pendingQuery, scoresQuery]);

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
      // Open/closing/draft cards always show a fit affordance — never blank.
      if (fitScoreApplies(tor) || pending.has(tor.id)) {
        return { ...tor, matchPending: true };
      }
      return tor;
    });
  }, [enabled, pending, scores, tors]);
}
