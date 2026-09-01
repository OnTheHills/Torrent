"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Bookmark02Icon } from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { useSaved } from "@/components/providers/saved-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SaveTorButton({
  torId,
  variant = "outline",
  size = "lg",
  className,
  showLabel = true,
}: {
  torId: string;
  variant?: "outline" | "default" | "ghost" | "secondary";
  size?: "sm" | "lg" | "default" | "icon";
  className?: string;
  showLabel?: boolean;
}) {
  const { t } = useLocale();
  const { isSaved, toggleSaved, ready } = useSaved();
  const saved = ready && isSaved(torId);

  return (
    <Button
      type="button"
      variant={saved ? "default" : variant}
      size={size}
      className={cn(className)}
      aria-pressed={saved}
      aria-label={saved ? t("unwatchListing") : t("watchListing")}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSaved(torId);
      }}
    >
      <HugeiconsIcon
        icon={Bookmark02Icon}
        strokeWidth={saved ? 2 : 1.75}
        className={cn(showLabel && "mr-1.5")}
      />
      {showLabel ? (saved ? t("unwatchListing") : t("watchListing")) : null}
    </Button>
  );
}
