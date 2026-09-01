import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Capability profile"
        description="Matching uses technologies, project types, and team size. Edits stay local in this prototype."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Studio details</CardTitle>
          <CardDescription>Seeded demo values for walkthrough.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium" htmlFor="company">
                Company
              </label>
              <Input id="company" defaultValue="Chao Phraya Labs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="size">
                Team size
              </label>
              <Input id="size" defaultValue="8–15" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="notify">
                Notification frequency
              </label>
              <Input id="notify" defaultValue="Immediate · Email" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium" htmlFor="caps">
                Capabilities
              </label>
              <Input
                id="caps"
                defaultValue="Web Application, Thai language UX, Government portal experience, AI / Analytics"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="button">Save profile (prototype)</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
