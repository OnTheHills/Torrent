import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { MatchBadge } from "@/components/tor/match-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
  title: "Vendor home",
};

export default function VendorHomePage() {
  const recent = MOCK_MATCHES.map((match) => ({
    match,
    tor: getTorById(match.torId),
  })).filter((item) => item.tor);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Inbox"
        title="Matched to your studio"
        description="When a software TOR aligns with your capability profile, it lands here — not in the public monitor."
        actions={
          <Button asChild size="sm">
            <Link href={routes.app.matches}>Open matches</Link>
          </Button>
        }
      />

      <div className="grid gap-4">
        {recent.map(({ match, tor }) =>
          tor ? (
            <Card key={match.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <MatchBadge score={match.matchScore} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(match.matchedAt)}
                  </span>
                </div>
                <CardTitle className="text-base">
                  <Link href={routes.app.tor(tor.id)} className="hover:text-primary">
                    {tor.title}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {agencyShort(tor.agencyId, "en")} · {tor.department} ·{" "}
                  {formatBudgetCompact(tor.budgetThb)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {match.reasons.map((reason) => (
                  <span
                    key={reason}
                    className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                  >
                    {reason}
                  </span>
                ))}
              </CardContent>
            </Card>
          ) : null
        )}
      </div>
    </div>
  );
}
