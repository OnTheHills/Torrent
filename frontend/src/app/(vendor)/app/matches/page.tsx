import type { Metadata } from "next";
import Link from "next/link";

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
  getTorById,
  MOCK_MATCHES,
} from "@/data/mock";

export const metadata: Metadata = {
  title: "Matches",
};

export default function MatchesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Notifications"
        title="Why you were matched"
        description="Each item shows the capabilities that triggered the match. This inbox is vendor-only."
      />

      <div className="space-y-4">
        {MOCK_MATCHES.map((match) => {
          const tor = getTorById(match.torId);
          if (!tor) return null;
          return (
            <Card key={match.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <MatchBadge score={match.matchScore} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(match.matchedAt)}
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
                  {match.reasons.map((reason) => (
                    <li
                      key={reason}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {reason}
                    </li>
                  ))}
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
