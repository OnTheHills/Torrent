"use client";

import { useState } from "react";

import { GoogleButton } from "@/components/auth/google-button";
import { Toggle } from "@/components/ui/toggle";
import { routes } from "@/config/routes";

const ROLE_OPTIONS = [
  { value: "public" as const, label: "Public", ariaLabel: "Public" },
  { value: "vendor" as const, label: "Vendor", ariaLabel: "Vendor" },
] as const;

export function RegisterGoogle() {
  const [role, setRole] = useState<"public" | "vendor">("vendor");

  return (
    <div className="space-y-3">
      <Toggle
        aria-label="Account type"
        value={role}
        onValueChange={setRole}
        options={ROLE_OPTIONS}
        className="w-full"
      />
      <GoogleButton role={role} afterVendor={routes.app.profile} />
    </div>
  );
}
