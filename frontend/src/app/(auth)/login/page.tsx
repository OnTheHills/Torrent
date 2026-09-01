import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routes } from "@/config/routes";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Log in</h1>
        <p className="text-sm text-muted-foreground">
          Prototype auth — no backend yet. Continue into the vendor app.
        </p>
      </div>
      <form className="space-y-3" action={routes.app.home}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium">
            Work email
          </label>
          <Input id="email" name="email" type="email" placeholder="you@studio.co" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-medium">
            Password
          </label>
          <Input id="password" name="password" type="password" placeholder="••••••••" />
        </div>
        <Button type="submit" className="w-full">
          Continue to vendor app
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New vendor?{" "}
        <Link href={routes.register} className="text-primary underline-offset-4 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
