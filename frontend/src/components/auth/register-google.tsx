"use client";

import { useState } from "react";

import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export function RegisterGoogle() {
  const [role, setRole] = useState<"public" | "vendor">("vendor");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={role === "public" ? "default" : "outline"}
          onClick={() => setRole("public")}
        >
          Public
        </Button>
        <Button
          type="button"
          variant={role === "vendor" ? "default" : "outline"}
          onClick={() => setRole("vendor")}
        >
          Vendor
        </Button>
      </div>
      <GoogleButton role={role} afterVendor={routes.app.profile} />
    </div>
  );
}