import type { Metadata } from "next";

import { SourceHealthPanel } from "@/components/admin/source-health-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AGENCIES } from "@/config/agencies";
import { fetchTors } from "@/lib/api";

export const metadata: Metadata = {
  title: "Admin",
};

const reviewQueue = [
  {
    id: "rev-1",
    title: "คอมพิวเตอร์และซอฟต์แวร์สนับสนุนงานสำนักงาน",
    confidence: 0.54,
    suggestion: "Likely non-software equipment — confirm exclusion",
  },
  {
    id: "rev-2",
    title: "จ้างพัฒนาระบบติดตามงบประมาณรายเขต",
    confidence: 0.71,
    suggestion: "Software-related · Web / Data Platform",
  },
];

export default async function AdminPage() {
  const tors = await fetchTors();
  const tracked = tors.length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Admin overview"
        description="Five software-TOR sources: BMA OCDS, MDES e-GP RSS, and public listings for DGA, depa, and Labour."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "TORs tracked", value: String(tracked) },
          { label: "Agencies", value: String(AGENCIES.length) },
          { label: "Low-confidence queue", value: String(reviewQueue.length) },
        ].map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <SourceHealthPanel />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classification review</CardTitle>
          <CardDescription>
            Ambiguous e-GP labels routed here before vendors see them (US-6 / US-18).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviewQueue.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.suggestion}</p>
              </div>
              <Badge variant="outline">
                Confidence {(item.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
