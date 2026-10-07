"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { MatchBadge } from "@/components/tor/match-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { routes } from "@/config/routes";
import { agencyShort } from "@/config/agencies";
import {
  formatBudgetCompact,
  formatDate,
} from "@/data/mock";
import { api, fetchTors } from "@/lib/api";
import type { Tor } from "@/types/tor";

type StoredMatch = {
  _id: string;
  torId: string;
  matchPercent: number | { $numberDecimal?: string };
  matchReason: string;
  updatedAt: string;
};

function matchScore(value: StoredMatch["matchPercent"]) {
  if (typeof value === "number") return value;
  return Number(value?.$numberDecimal) || 0;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<StoredMatch[]>([]);
  const [torsById, setTorsById] = useState<Record<string, Tor>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<StoredMatch[]>("/tor-matches/mine"), fetchTors()])
      .then(([storedMatches, tors]) => {
        setMatches([...storedMatches].sort((a, b) => matchScore(b.matchPercent) - matchScore(a.matchPercent)));
        setTorsById(Object.fromEntries(tors.map((tor) => [tor.id, tor])));
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "Unable to load matches");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Notifications"
        title="Why you were matched"
        description="Each item shows the capabilities that triggered the match. This inbox is vendor-only."
      />

      <div className="space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">Loading matches…</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!loading && !error && matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matches yet. Your profile has been queued against the current TORs.
          </p>
        ) : null}
        {matches.map((match) => {
          const tor = torsById[match.torId];
          if (!tor) return null;
          return (
            <Card key={match._id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <MatchBadge score={matchScore(match.matchPercent)} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(match.updatedAt)}
                  </span>
                </div>
                <CardTitle className="text-base">{tor.title}</CardTitle>
                <CardDescription>
                  {agencyShort(tor.agencyId, "en")} · {tor.department} ·{" "}
                  {formatBudgetCompact(tor.budgetThb)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-2">
                  <li className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {match.matchReason}
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="gap-2">
                <Button asChild size="sm">
                  <Link href={routes.app.tor(tor.id)}>View TOR</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={tor.egpUrl} target="_blank" rel="noreferrer">
                    Apply on e-GP
                  </a>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
