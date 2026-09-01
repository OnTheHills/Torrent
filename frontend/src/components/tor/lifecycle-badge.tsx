"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TorLifecycle } from "@/types/tor";

const STYLES: Record<TorLifecycle, string> = {
  draft:
    "border-transparent bg-lifecycle-draft text-lifecycle-draft-foreground",
  published:
    "border-transparent bg-lifecycle-published text-lifecycle-published-foreground",
  awarded:
    "border-transparent bg-lifecycle-awarded text-lifecycle-awarded-foreground",
};

export function LifecycleBadge({
  lifecycle,
  className,
}: {
  lifecycle: TorLifecycle;
  className?: string;
}) {
  const { t } = useLocale();
  const label =
    lifecycle === "draft"
      ? t("draft")
      : lifecycle === "published"
        ? t("published")
        : t("awarded");

  return (
    <Badge className={cn(STYLES[lifecycle], className)} variant="outline">
      {label}
    </Badge>
  );
}
