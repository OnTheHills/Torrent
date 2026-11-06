import type { Metadata } from "next";
import Link from "next/link";

import { DevAdminShortcut } from "@/components/auth/dev-admin-shortcut";
import { GoogleButton } from "@/components/auth/google-button";
import { routes } from "@/config/routes";

export const metadata: Metadata = {
  title: "Welcome back",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with Google to open your vendor workspace, saved listings, and
          alerts.
        </p>
      </div>
      <GoogleButton />
      <p className="text-center text-sm text-muted-foreground">
        New vendor?{" "}
        <Link href={routes.register} className="text-primary underline-offset-4 hover:underline">
          Register
        </Link>
      </p>
      <DevAdminShortcut />
    </div>
  );
}
