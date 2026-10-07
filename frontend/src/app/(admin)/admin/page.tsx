import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { AdminStats } from "@/components/admin/admin-stats";
import { SourceHealthPanel } from "@/components/admin/source-health-panel";
import { MonitorSection } from "@/components/monitor/monitor-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AGENCIES } from "@/config/agencies";
import { routes } from "@/config/routes";
import { fetchTors } from "@/lib/api";

export const metadata: Metadata = {
  title: "Admin",
};

const frostButton =
  "border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]";

const frostTealButton =
  "border-0 bg-[color-mix(in_srgb,var(--palette-teal-400)_32%,transparent)] text-[var(--palette-teal-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[color-mix(in_srgb,var(--palette-teal-400)_44%,transparent)]";

const frostPanel =
  "rounded-lg bg-[color-mix(in_srgb,var(--palette-gray-50)_62%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] backdrop-blur-md backdrop-saturate-150";

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

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden hero-atmosphere text-hero-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(144px+2rem)] sm:px-6 md:pb-12 md:pt-[calc(144px+3rem)]">
          <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
              Admin overview
            </h1>
            <p className="mt-5 text-base leading-[1.7] text-hero-muted md:text-lg">
              Five software-TOR sources: BMA OCDS, MDES e-GP RSS, and public
              listings for DGA, depa, and Labour.
            </p>
          </div>
          <div className="mt-9 flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className={frostTealButton}>
              <Link href={routes.tors}>
                Browse listings
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Link>
            </Button>
            <Button asChild size="lg" className={frostButton}>
              <Link href={routes.monitor}>Open monitor</Link>
            </Button>
          </div>
        </div>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
        <AdminStats
          tracked={tors.length}
          agencies={AGENCIES.length}
          queue={reviewQueue.length}
        />

        <SourceHealthPanel />

        <MonitorSection
          title="Classification review"
          description="Ambiguous e-GP labels routed here before vendors see them."
          surfaceClassName={frostPanel}
        >
          <ul className="space-y-3">
            {reviewQueue.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg bg-[color-mix(in_srgb,white_55%,transparent)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.suggestion}</p>
                </div>
                <Badge variant="outline">
                  Confidence {(item.confidence * 100).toFixed(0)}%
                </Badge>
              </li>
            ))}
          </ul>
        </MonitorSection>
      </div>
    </div>
  );
}
