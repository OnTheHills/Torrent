"use client";

import { useRouter } from "next/navigation";

import { useAudience, type Audience } from "@/components/providers/audience-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { Toggle } from "@/components/ui/toggle";
import { routes } from "@/config/routes";

const DEST: Record<Audience, string> = {
  public: routes.home,
  vendor: routes.app.home,
  admin: routes.admin.home,
};

export function ViewToggle({
  className,
  tone,
}: {
  className?: string;
  tone?: "default" | "chrome";
}) {
  const { t } = useLocale();
  const audience = useAudience();
  const router = useRouter();

  const options = [
    { value: "public" as const, label: "Public", ariaLabel: t("audiencePublic") },
    { value: "vendor" as const, label: "Vendor", ariaLabel: t("audienceVendor") },
    { value: "admin" as const, label: "Admin", ariaLabel: t("audienceAdmin") },
  ];

  return (
    <Toggle
      aria-label={t("viewToggle")}
      value={audience}
      onValueChange={(next: Audience) => {
        if (next !== audience) router.push(DEST[next]);
      }}
      options={options}
      className={className}
      tone={tone}
    />
  );
}
