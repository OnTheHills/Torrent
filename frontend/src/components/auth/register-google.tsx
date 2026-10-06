"use client";

import { useState } from "react";

import { GoogleButton } from "@/components/auth/google-button";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "public", label: "Public" },
  { value: "vendor", label: "Vendor" },
] as const;

export function RegisterGoogle() {
  const [role, setRole] = useState<"public" | "vendor">("vendor");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {ROLES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={role === option.value}
            onClick={() => setRole(option.value)}
            className={cn(
              "inline-flex h-8 items-center justify-center rounded-full border-0 px-3.5 text-xs/relaxed font-medium ring-1 backdrop-blur-md backdrop-saturate-150 transition-[transform,background-color,color] duration-200 ease-out outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring/35 motion-reduce:transition-none motion-reduce:hover:transform-none",
              role === option.value
                ? "bg-[color-mix(in_srgb,var(--palette-teal-400)_32%,transparent)] text-[var(--palette-teal-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)]"
                : "bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)]",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <GoogleButton role={role} afterVendor={routes.app.profile} />
    </div>
  );
}
