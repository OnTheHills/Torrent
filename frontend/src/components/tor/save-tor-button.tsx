"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Bookmark02Icon, HeartIcon } from "@hugeicons/core-free-icons";

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
  appearance = "button",
}: {
  torId: string;
  variant?: "outline" | "default" | "ghost" | "secondary";
  size?: "sm" | "lg" | "default" | "icon";
  className?: string;
  showLabel?: boolean;
  appearance?: "button" | "frost-circle";
}) {
  const { t } = useLocale();
  const { isSaved, toggleSaved, ready } = useSaved();
  const saved = ready && isSaved(torId);

  function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    toggleSaved(torId);
  }

  if (appearance === "frost-circle") {
    return (
      <button
        type="button"
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-full shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] backdrop-blur-md backdrop-saturate-150 transition-[transform,background-color,color] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 motion-reduce:transition-none motion-reduce:hover:transform-none",
          saved
            ? "bg-[color-mix(in_srgb,#f7b6cf_72%,transparent)] text-[#e44586] ring-1 ring-[color-mix(in_srgb,#f4a0c0_90%,transparent)]"
            : "bg-[color-mix(in_srgb,var(--palette-gray-200)_90%,transparent)] text-[var(--palette-gray-800)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)]",
          className,
        )}
        aria-pressed={saved}
        aria-label={saved ? t("unwatchListing") : t("watchListing")}
        onClick={toggle}
      >
        <HugeiconsIcon
          icon={HeartIcon}
          strokeWidth={1.75}
          className={cn("size-4", saved && "[&_path]:fill-[#e44586]")}
        />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={saved ? "default" : variant}
      size={size}
      className={cn(className)}
      aria-pressed={saved}
      aria-label={saved ? t("unwatchListing") : t("watchListing")}
      onClick={toggle}
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
