"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getMe } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialProfile = {
  companyName: "Chao Phraya Labs",
  companyEmail: "hello@chaophrayalabs.co",
  companyPhone: "+66 2 123 4567",
  teamSize: "8–15",
  notificationFrequency: "Immediate · Email",
  vendorCapDescription:
    "Web Application, Thai language UX, Government portal experience, AI / Analytics",
  techSkills: "Next.js, TypeScript, UX research, Data dashboards",
  pastProjects: "Bangkok civic services portal, SME grant discovery platform",
  website: "https://chaophrayalabs.co",
  location: "Bangkok, Thailand",
  bio: "A Bangkok-based product studio focused on useful, accessible technology.",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState(initialProfile);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function updateProfile(field: keyof typeof initialProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit() {
    setIsSaving(true);
    setSaveMessage("");
    setSaveFailed(false);

    try {
      const currentUser = await getMe();
      let existingProfile: { _id: string } | null = null;

      try {
        existingProfile = await api<{ _id: string } | null>(
          `/vendor-profiles/get/${currentUser._id}`,
        );
      } catch (error) {
        const status =
          error instanceof Error &&
          "status" in error &&
          typeof error.status === "number"
            ? error.status
            : undefined;

        if (status !== 404) {
          throw error;
        }
      }

      const submittedProfile = {
        userId: currentUser._id,
        companyName: profile.companyName,
        companyEmail: profile.companyEmail,
        vendorCapDescription: profile.vendorCapDescription,
        teamSize: profile.teamSize,
        techSkills: profile.techSkills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        pastProjects: profile.pastProjects
          .split(",")
          .map((project) => project.trim())
          .filter(Boolean),
        website: profile.website,
        companyPhone: profile.companyPhone,
        bio: profile.bio,
        location: profile.location,
      };

      const hasExistingProfile = Boolean(existingProfile?._id);

      await api(
        hasExistingProfile
          ? `/vendor-profiles/${existingProfile?._id}`
          : "/vendor-profiles",
        {
          method: hasExistingProfile ? "PATCH" : "POST",
          body: JSON.stringify(submittedProfile),
        },
      );

      console.log(
        "Vendor profile submitted to backend:\n",
        JSON.stringify(submittedProfile, null, 2),
      );
      setSaveMessage("Profile saved successfully");
      window.setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Vendor profile submission failed:", error);
      setSaveFailed(true);
      setSaveMessage(
        error instanceof Error ? error.message : "Unable to save profile",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <section className="relative -mt-[144px] overflow-hidden hero-atmosphere text-hero-foreground">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(72px+4rem)] sm:px-6 md:pb-12 md:pt-[calc(72px+6rem)]">
          <div className="mt-2 w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hero-muted">
              Account
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
              Capability profile
            </h1>
            <p className="mt-5 text-base leading-[1.7] text-hero-muted md:text-lg">
              Matching uses technologies, project types, and team size. Edits
              stay local in this prototype.
            </p>
          </div>
        </div>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <Card className="rounded-lg bg-[color-mix(in_srgb,var(--palette-gray-50)_62%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] backdrop-blur-md backdrop-saturate-150">
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
                <Input
                  id="company"
                  value={profile.companyName}
                  onChange={(event) =>
                    updateProfile("companyName", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="size">
                  Team size
                </label>
                <Input
                  id="size"
                  value={profile.teamSize}
                  onChange={(event) => updateProfile("teamSize", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="notify">
                  Notification frequency
                </label>
                <Input
                  id="notify"
                  value={profile.notificationFrequency}
                  onChange={(event) =>
                    updateProfile("notificationFrequency", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium" htmlFor="caps">
                  Capabilities
                </label>
                <Input
                  id="caps"
                  value={profile.vendorCapDescription}
                  onChange={(event) =>
                    updateProfile("vendorCapDescription", event.target.value)
                  }
                />
              </div>
              <div className="mt-2 grid gap-5 pt-5 sm:col-span-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="companyEmail">
                    Company email
                  </label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={profile.companyEmail}
                    onChange={(event) =>
                      updateProfile("companyEmail", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="companyPhone">
                    Company phone
                  </label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={profile.companyPhone}
                    onChange={(event) =>
                      updateProfile("companyPhone", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="techSkills">
                    Tech skills
                  </label>
                  <Input
                    id="techSkills"
                    value={profile.techSkills}
                    onChange={(event) =>
                      updateProfile("techSkills", event.target.value)
                    }
                    placeholder="Separate skills with commas"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="pastProjects">
                    Past projects
                  </label>
                  <Input
                    id="pastProjects"
                    value={profile.pastProjects}
                    onChange={(event) =>
                      updateProfile("pastProjects", event.target.value)
                    }
                    placeholder="Separate projects with commas"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="website">
                    Website
                  </label>
                  <Input
                    id="website"
                    type="url"
                    value={profile.website}
                    onChange={(event) => updateProfile("website", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="location">
                    Location
                  </label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(event) => updateProfile("location", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium" htmlFor="bio">
                    Bio
                  </label>
                  <Input
                    id="bio"
                    value={profile.bio}
                    onChange={(event) => updateProfile("bio", event.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Button type="button" onClick={handleSubmit} disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save profile"}
                </Button>
                {saveMessage ? (
                  <p
                    className={`text-xs font-medium ${
                      saveFailed
                        ? "text-destructive"
                        : "text-emerald-600"
                    }`}
                    role="status"
                  >
                    {saveMessage}
                  </p>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
