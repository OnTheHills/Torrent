"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IntegrityStatus } from "@/types/tor";

export function IntegrityBadge({
  status,
  className,
}: {
  status: IntegrityStatus;
  className?: string;
}) {
  const { t } = useLocale();
  const flagged = status === "suspicious";

  return (
    <Badge
      variant="outline"
      className={cn(
        flagged
          ? "border-transparent bg-warning text-warning-foreground"
          : "border-transparent bg-secondary text-secondary-foreground",
        className
      )}
    >
      {flagged ? t("integritySuspicious") : t("integrityOk")}
    </Badge>
  );
}
