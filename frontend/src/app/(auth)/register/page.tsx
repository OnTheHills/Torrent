import type { Metadata } from "next";
import Link from "next/link";

import { RegisterGoogle } from "@/components/auth/register-google";
import { routes } from "@/config/routes";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Create account</h1>
        <p className="text-sm text-muted-foreground">
          Choose Public or Vendor, then continue with Google. Vendors add company
          and capabilities on their profile after sign-in.
        </p>
      </div>
      <RegisterGoogle />
      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href={routes.login} className="text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}