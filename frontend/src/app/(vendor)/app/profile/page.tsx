"use client";

import { useEffect, useRef, useState } from "react";
import {
  Cancel01Icon,
  PlusSignIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { TOR_CATEGORIES } from "@/components/tor/tor-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getMe } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const fieldClass =
  "h-8 rounded-[6px] border-0 bg-white px-3.5 text-sm shadow-none ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_32%,transparent)] md:text-sm focus-visible:border-transparent focus-visible:ring-[color-mix(in_srgb,var(--palette-teal-400)_45%,transparent)]";

function fitTextBox(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

const profileCard =
  "px-2 py-6 rounded-lg bg-[color-mix(in_srgb,var(--palette-gray-50)_62%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_88%,transparent)] ring-1 ring-[color-mix(in_srgb,white_72%,transparent)] backdrop-blur-md backdrop-saturate-150";

const CAPABILITY_GROUPS = [
  {
    label: "Project types",
    options: TOR_CATEGORIES.filter((category) => category !== "Others"),
  },
  {
    label: "Services",
    options: [
      "System maintenance (MA)",
      "System analysis & design",
      "Database administration",
      "Data migration",
      "Cloud & server hosting",
      "Network & infrastructure",
      "API & system integration",
      "UX/UI design",
      "Help desk & support",
      "Training & handover",
    ],
  },
  {
    label: "Government experience",
    options: [
      "Government portal experience",
      "e-Document (e-Saraban)",
      "Thai language UX",
      "PDPA compliance",
      "Accessibility (WCAG)",
    ],
  },
];

const CAPABILITY_OPTIONS = CAPABILITY_GROUPS.flatMap((group) => group.options);

const TECHNOLOGY_OPTIONS = [
  "Web Application",
  "Mobile Application",
  "SQL Server",
  "Oracle",
  "Android",
  "iOS",
  "Java",
  ".NET",
  "Python",
  "PHP",
];

function capabilityList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasCapability(items: string[], name: string) {
  return items.some((item) => item.toLowerCase() === name.toLowerCase());
}

const frostPill =
  "inline-flex h-7 items-center justify-center rounded-full border-0 px-3.5 text-xs/relaxed font-medium ring-1 backdrop-blur-md backdrop-saturate-150 transition-[transform,background-color,color] duration-200 ease-out outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring/35 motion-reduce:transition-none motion-reduce:hover:transform-none";
const frostPillIdle =
  "bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)]";
const frostPillOn =
  "bg-[color-mix(in_srgb,var(--palette-teal-400)_32%,transparent)] text-[var(--palette-teal-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)]";
const frostPillDanger =
  "bg-[color-mix(in_srgb,var(--palette-red-400)_32%,transparent)] text-[var(--palette-red-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-[color-mix(in_srgb,var(--palette-red-400)_48%,transparent)] hover:bg-[color-mix(in_srgb,var(--palette-red-400)_44%,transparent)]";

const frostButton =
  "border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]";

type SavedProfile = {
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  teamSize?: string;
  vendorCapDescription?: string;
  techSkills?: string[];
  pastProjects?: string[];
  website?: string;
  location?: string;
  bio?: string;
} | null;

const initialProfile = {
  companyName: "",
  companyEmail: "",
  companyPhone: "",
  teamSize: "",
  vendorCapDescription: "",
  techSkills: "",
  pastProjects: "",
  website: "",
  location: "",
  bio: "",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState(initialProfile);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addingCapability, setAddingCapability] = useState(false);
  const [customCapability, setCustomCapability] = useState("");
  const customCommitted = useRef(false);
  const [addingTechnology, setAddingTechnology] = useState(false);
  const [customTechnology, setCustomTechnology] = useState("");
  const techCommitted = useRef(false);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const pastProjectsRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (bioRef.current) fitTextBox(bioRef.current);
  }, [profile.bio]);

  useEffect(() => {
    if (pastProjectsRef.current) fitTextBox(pastProjectsRef.current);
  }, [profile.pastProjects]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const currentUser = await getMe();
        const saved = await api<SavedProfile>(
          `/vendor-profiles/get/${currentUser._id}`,
        );
        if (cancelled || !saved) return;
        setProfile({
          companyName: saved.companyName ?? "",
          companyEmail: saved.companyEmail ?? "",
          companyPhone: saved.companyPhone ?? "",
          teamSize: saved.teamSize ?? "",
          vendorCapDescription: saved.vendorCapDescription ?? "",
          techSkills: (saved.techSkills ?? []).join(", "),
          pastProjects: (saved.pastProjects ?? []).join("\n"),
          website: saved.website ?? "",
          location: saved.location ?? "",
          bio: saved.bio ?? "",
        });
      } catch {
        // No saved profile yet, or signed out: keep the empty form.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateProfile(field: keyof typeof initialProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  const selectedCapabilities = capabilityList(profile.vendorCapDescription);
  const customCapabilities = selectedCapabilities.filter(
    (item) =>
      !CAPABILITY_OPTIONS.some(
        (option) => option.toLowerCase() === item.toLowerCase(),
      ),
  );

  function toggleCapability(name: string) {
    const next = hasCapability(selectedCapabilities, name)
      ? selectedCapabilities.filter(
          (item) => item.toLowerCase() !== name.toLowerCase(),
        )
      : [...selectedCapabilities, name];
    updateProfile("vendorCapDescription", next.join(", "));
  }

  function addCustomCapability(raw = customCapability) {
    if (customCommitted.current) return;
    customCommitted.current = true;
    const name = raw.trim().replace(/,/g, "");
    if (name && !hasCapability(selectedCapabilities, name)) {
      updateProfile(
        "vendorCapDescription",
        [...selectedCapabilities, name].join(", "),
      );
    }
    setCustomCapability("");
    setAddingCapability(false);
  }

  const selectedTechnologies = capabilityList(profile.techSkills);
  const customTechnologies = selectedTechnologies.filter(
    (item) =>
      !TECHNOLOGY_OPTIONS.some(
        (option) => option.toLowerCase() === item.toLowerCase(),
      ),
  );

  function toggleTechnology(name: string) {
    const next = hasCapability(selectedTechnologies, name)
      ? selectedTechnologies.filter(
          (item) => item.toLowerCase() !== name.toLowerCase(),
        )
      : [...selectedTechnologies, name];
    updateProfile("techSkills", next.join(", "));
  }

  function addCustomTechnology(raw = customTechnology) {
    if (techCommitted.current) return;
    techCommitted.current = true;
    const name = raw.trim().replace(/,/g, "");
    if (name && !hasCapability(selectedTechnologies, name)) {
      updateProfile("techSkills", [...selectedTechnologies, name].join(", "));
    }
    setCustomTechnology("");
    setAddingTechnology(false);
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
          .split(/[,\n]/)
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
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[calc(144px+2rem)] sm:px-6 md:pb-12 md:pt-[calc(144px+3rem)]">
          <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
              Capability profile
            </h1>
            <p className="mt-5 text-base leading-[1.7] text-hero-muted md:text-lg">
              Matching uses technologies, project types, and team size. Saving
              queues your profile against current TORs.
            </p>
          </div>
        </div>
        <div aria-hidden className="h-px bg-border" />
      </section>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6 md:py-16">
        <form className="space-y-6">
          <Card className={profileCard}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold leading-snug tracking-tight">
                Company Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2.5 sm:col-span-2">
                  <label
                    className="text-sm font-medium leading-snug"
                    htmlFor="company"
                  >
                    Company name
                  </label>
                  <Input
                    className={fieldClass}
                    id="company"
                    value={profile.companyName}
                    onChange={(event) =>
                      updateProfile("companyName", event.target.value)
                    }
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <label
                    className="text-sm font-medium leading-snug"
                    htmlFor="size"
                  >
                    Team size
                  </label>
                  <Input
                    className={fieldClass}
                    id="size"
                    inputMode="numeric"
                    placeholder="Number of people"
                    value={profile.teamSize}
                    onChange={(event) =>
                      updateProfile("teamSize", event.target.value)
                    }
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <label
                    className="text-sm font-medium leading-snug"
                    htmlFor="location"
                  >
                    City
                  </label>
                  <Input
                    className={fieldClass}
                    id="location"
                    placeholder="Bangkok"
                    value={profile.location}
                    onChange={(event) =>
                      updateProfile("location", event.target.value)
                    }
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <label
                    className="text-sm font-medium leading-snug"
                    htmlFor="companyEmail"
                  >
                    Email
                  </label>
                  <Input
                    className={fieldClass}
                    id="companyEmail"
                    type="email"
                    value={profile.companyEmail}
                    onChange={(event) =>
                      updateProfile("companyEmail", event.target.value)
                    }
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <label
                    className="text-sm font-medium leading-snug"
                    htmlFor="companyPhone"
                  >
                    Phone
                  </label>
                  <Input
                    className={fieldClass}
                    id="companyPhone"
                    type="tel"
                    value={profile.companyPhone}
                    onChange={(event) =>
                      updateProfile("companyPhone", event.target.value)
                    }
                  />
                </div>
                <div className="flex flex-col gap-2.5 sm:col-span-2">
                  <label
                    className="text-sm font-medium leading-snug"
                    htmlFor="website"
                  >
                    Website
                  </label>
                  <Input
                    className={fieldClass}
                    id="website"
                    type="url"
                    placeholder="https://"
                    value={profile.website}
                    onChange={(event) =>
                      updateProfile("website", event.target.value)
                    }
                  />
                </div>
                <div className="flex flex-col gap-2.5 sm:col-span-2">
                  <label
                    className="text-sm font-medium leading-snug"
                    htmlFor="bio"
                  >
                    About the company
                  </label>
                  <textarea
                    ref={bioRef}
                    className={cn(
                      fieldClass,
                      "h-auto min-h-16 resize-none overflow-hidden py-2 leading-5",
                    )}
                    id="bio"
                    rows={2}
                    value={profile.bio}
                    onChange={(event) => {
                      updateProfile("bio", event.target.value);
                      fitTextBox(event.currentTarget);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={profileCard}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold leading-snug tracking-tight">
                What you deliver
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-8 sm:grid-cols-2">
                <div
                  role="group"
                  aria-labelledby="caps-label"
                  className="space-y-4 sm:col-span-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p
                      id="caps-label"
                      className="text-base font-medium leading-snug"
                    >
                      Capabilities
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {selectedCapabilities.length ? (
                          <>
                            <span className="font-semibold tabular-nums text-foreground">
                              {selectedCapabilities.length}
                            </span>{" "}
                            selected
                          </>
                        ) : (
                          "None selected"
                        )}
                      </span>
                      {selectedCapabilities.length ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateProfile("vendorCapDescription", "")
                          }
                          className={cn(frostPill, frostPillIdle)}
                        >
                          Clear all
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {CAPABILITY_GROUPS.map((group) => (
                    <div key={group.label} className="space-y-2">
                      <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {group.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {group.options.map((capability) => {
                          const selected = hasCapability(
                            selectedCapabilities,
                            capability,
                          );
                          return (
                            <button
                              key={capability}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => toggleCapability(capability)}
                              className={cn(
                                frostPill,
                                "gap-1.5",
                                selected ? frostPillOn : frostPillIdle,
                              )}
                            >
                              {selected ? (
                                <HugeiconsIcon
                                  icon={Tick02Icon}
                                  strokeWidth={2}
                                  className="size-3.5"
                                />
                              ) : null}
                              {capability}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="space-y-2">
                    <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                      Your own
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {customCapabilities.map((capability) => (
                        <button
                          key={capability}
                          type="button"
                          aria-label={`Remove ${capability}`}
                          onClick={() => toggleCapability(capability)}
                          className={cn(frostPill, frostPillOn, "gap-1.5")}
                        >
                          {capability}
                          <HugeiconsIcon
                            icon={Cancel01Icon}
                            strokeWidth={2}
                            className="size-3.5"
                          />
                        </button>
                      ))}
                      {addingCapability ? (
                        <input
                          autoFocus
                          aria-label="Custom capability"
                          value={customCapability}
                          placeholder="Your capability"
                          onChange={(event) =>
                            setCustomCapability(event.target.value)
                          }
                          onBlur={(event) =>
                            addCustomCapability(event.currentTarget.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addCustomCapability(event.currentTarget.value);
                            }
                            if (event.key === "Escape") {
                              customCommitted.current = true;
                              setCustomCapability("");
                              setAddingCapability(false);
                            }
                          }}
                          className={cn(fieldClass, "w-44")}
                        />
                      ) : (
                        <button
                          type="button"
                          aria-label="Add your own capability"
                          onClick={() => {
                            customCommitted.current = false;
                            setCustomCapability("");
                            setAddingCapability(true);
                          }}
                          className={cn(
                            frostPill,
                            frostPillIdle,
                            "gap-1.5 px-3",
                          )}
                        >
                          <HugeiconsIcon
                            icon={PlusSignIcon}
                            strokeWidth={2}
                            className="size-3.5"
                          />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  role="group"
                  aria-labelledby="tech-label"
                  className="space-y-4 sm:col-span-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p
                      id="tech-label"
                      className="text-base font-medium leading-snug"
                    >
                      Technologies
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {selectedTechnologies.length ? (
                          <>
                            <span className="font-semibold tabular-nums text-foreground">
                              {selectedTechnologies.length}
                            </span>{" "}
                            selected
                          </>
                        ) : (
                          "None selected"
                        )}
                      </span>
                      {selectedTechnologies.length ? (
                        <button
                          type="button"
                          onClick={() => updateProfile("techSkills", "")}
                          className={cn(frostPill, frostPillIdle)}
                        >
                          Clear all
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TECHNOLOGY_OPTIONS.map((technology) => {
                      const selected = hasCapability(
                        selectedTechnologies,
                        technology,
                      );
                      return (
                        <button
                          key={technology}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleTechnology(technology)}
                          className={cn(
                            frostPill,
                            "gap-1.5",
                            selected ? frostPillOn : frostPillIdle,
                          )}
                        >
                          {selected ? (
                            <HugeiconsIcon
                              icon={Tick02Icon}
                              strokeWidth={2}
                              className="size-3.5"
                            />
                          ) : null}
                          {technology}
                        </button>
                      );
                    })}
                    {customTechnologies.map((technology) => (
                      <button
                        key={technology}
                        type="button"
                        aria-label={`Remove ${technology}`}
                        onClick={() => toggleTechnology(technology)}
                        className={cn(frostPill, frostPillOn, "gap-1.5")}
                      >
                        {technology}
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          strokeWidth={2}
                          className="size-3.5"
                        />
                      </button>
                    ))}
                    {addingTechnology ? (
                      <input
                        autoFocus
                        aria-label="Custom technology"
                        value={customTechnology}
                        placeholder="Your technology"
                        onChange={(event) =>
                          setCustomTechnology(event.target.value)
                        }
                        onBlur={(event) =>
                          addCustomTechnology(event.currentTarget.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addCustomTechnology(event.currentTarget.value);
                          }
                          if (event.key === "Escape") {
                            techCommitted.current = true;
                            setCustomTechnology("");
                            setAddingTechnology(false);
                          }
                        }}
                        className={cn(fieldClass, "w-44")}
                      />
                    ) : (
                      <button
                        type="button"
                        aria-label="Add your own technology"
                        onClick={() => {
                          techCommitted.current = false;
                          setCustomTechnology("");
                          setAddingTechnology(true);
                        }}
                        className={cn(frostPill, frostPillIdle, "gap-1.5 px-3")}
                      >
                        <HugeiconsIcon
                          icon={PlusSignIcon}
                          strokeWidth={2}
                          className="size-3.5"
                        />
                        Add
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 sm:col-span-2">
                  <label
                    className="text-base font-medium leading-snug"
                    htmlFor="pastProjects"
                  >
                    Similar past work
                  </label>
                  <textarea
                    ref={pastProjectsRef}
                    className={cn(
                      fieldClass,
                      "h-auto min-h-16 resize-none overflow-hidden py-2 leading-5",
                    )}
                    id="pastProjects"
                    rows={2}
                    value={profile.pastProjects}
                    onChange={(event) => {
                      updateProfile("pastProjects", event.target.value);
                      fitTextBox(event.currentTarget);
                    }}
                    placeholder="One project per line, or separate with commas"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            {saveMessage ? (
              <p
                className={`text-sm font-medium ${
                  saveFailed ? "text-destructive" : "text-emerald-600"
                }`}
                role="status"
              >
                {saveMessage}
              </p>
            ) : null}
            <Button
              type="button"
              className={frostButton}
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
