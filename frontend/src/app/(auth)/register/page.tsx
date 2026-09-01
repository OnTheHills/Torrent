import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routes } from "@/config/routes";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Create vendor account</h1>
        <p className="text-sm text-muted-foreground">
          Capability profile unlocks matching and draft TOR notifications.
        </p>
      </div>
      <form className="space-y-3" action={routes.app.profile}>
        <div className="space-y-1.5">
          <label htmlFor="company" className="text-xs font-medium">
            Company / studio
          </label>
          <Input id="company" name="company" placeholder="Lotus Byte" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium">
            Work email
          </label>
          <Input id="email" name="email" type="email" placeholder="hello@lotusbyte.co" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="capabilities" className="text-xs font-medium">
            Capabilities (comma-separated)
          </label>
          <Input
            id="capabilities"
            name="capabilities"
            placeholder="Web Application, Thai UX, Mobile"
          />
        </div>
        <Button type="submit" className="w-full">
          Create profile
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href={routes.login} className="text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
