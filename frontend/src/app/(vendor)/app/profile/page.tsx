"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Cancel01Icon,
  PlusSignIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { TOR_CATEGORIES } from "@/components/tor/tor-filters";
import { CertificateUploads, emptyCertificates, savedCertificateSelections } from "@/components/profile/certificate-uploads";
import type { CertificateField } from "@/components/profile/certificate-uploads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  element.style.height = "0px";
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

/** Same neutral frost fill as Add pills, sized for form controls. */
const frostField =
  "h-8! w-full rounded-full border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] px-3.5 text-sm text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 focus-visible:border-transparent focus-visible:ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)]";

const frostButton =
  "border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150 hover:bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))]";

type PastProject = {
  name: string;
  description: string;
  budget: number | null;
  isGovernment: boolean | null;
  completedAt: string | null;
  urls?: string[];
};

type ProjectRow = {
  name: string;
  description: string;
  budget: string;
  isGovernment: string;
  completedAt: string;
  urls: string[];
};

const emptyProject = (): ProjectRow => ({
  name: "",
  description: "",
  budget: "",
  isGovernment: "",
  completedAt: "",
  urls: [],
});

/** ISO yyyy-mm-dd → dd/mm/yyyy for the frost date field. */
function isoToDisplayDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

/** dd/mm/yyyy → ISO yyyy-mm-dd, or "" if empty/invalid. */
function displayToIsoDate(display: string) {
  const trimmed = display.trim();
  if (!trimmed) return "";
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(`${iso}T00:00:00`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day
  ) {
    return "";
  }
  return iso;
}

function toProjectRow(project: PastProject | string): ProjectRow {
  if (typeof project === "string") {
    return { ...emptyProject(), name: project };
  }
  return {
    name: project.name ?? "",
    description: project.description ?? "",
    budget: project.budget == null ? "" : String(project.budget),
    isGovernment:
      project.isGovernment == null ? "" : String(project.isGovernment),
    completedAt: isoToDisplayDate(project.completedAt?.slice(0, 10) ?? ""),
    urls: (project.urls ?? []).map((url) => url.trim()).filter(Boolean),
  };
}

function projectHasContent(project: ProjectRow) {
  return Boolean(
    project.name.trim() ||
      project.description.trim() ||
      project.budget.trim() ||
      project.isGovernment.trim() ||
      project.completedAt.trim() ||
      project.urls.length,
  );
}

type SavedProfile = {
  securityCertificates?: string[];
  aiCertificates?: string[];
  otherCertificates?: string[];
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  teamSize?: string;
  vendorCapDescription?: string;
  techSkills?: string[];
  pastProjects?: (PastProject | string)[];
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
  pastProjects: [emptyProject()] as ProjectRow[],
  website: "",
  location: "",
  bio: "",
};

const projectFrostCard =
  "relative w-full rounded-xl bg-[color-mix(in_srgb,white_78%,transparent)] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_36%,transparent)] backdrop-blur-md backdrop-saturate-150 md:p-6";

export default function ProfilePage() {
  const [profile, setProfile] = useState(initialProfile);
  const [certificates, setCertificates] = useState(emptyCertificates);
  const [checkingCertificates, setCheckingCertificates] = useState<Partial<Record<CertificateField, boolean>>>({});
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addingCapability, setAddingCapability] = useState(false);
  const [customCapability, setCustomCapability] = useState("");
  const customCommitted = useRef(false);
  const [addingTechnology, setAddingTechnology] = useState(false);
  const [customTechnology, setCustomTechnology] = useState("");
  const techCommitted = useRef(false);
  const [addingUrlIndex, setAddingUrlIndex] = useState<number | null>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const urlCommitted = useRef(false);
  const bioRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (bioRef.current) fitTextBox(bioRef.current);
  }, [profile.bio]);

  useLayoutEffect(() => {
    document
      .querySelectorAll<HTMLTextAreaElement>("[data-project-description]")
      .forEach(fitTextBox);
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
        setCertificates(savedCertificateSelections(saved));
        setProfile({
          companyName: saved.companyName ?? "",
          companyEmail: saved.companyEmail ?? "",
          companyPhone: saved.companyPhone ?? "",
          teamSize: saved.teamSize ?? "",
          vendorCapDescription: saved.vendorCapDescription ?? "",
          techSkills: (saved.techSkills ?? []).join(", "),
          pastProjects: (() => {
            const rows = (saved.pastProjects ?? []).map(toProjectRow);
            return rows.length ? rows : [emptyProject()];
          })(),
          website: saved.website ?? "",
          location: saved.location ?? "",
          bio: saved.bio ?? "",
        });
      } catch (error) {
        // A missing profile is expected for new vendors. Other failures must
        // not allow an empty certificate selection to overwrite saved paths.
        if (!cancelled && (error as { status?: number }).status !== 404) {
          setProfileLoadFailed(true);
          setSaveFailed(true);
          setSaveMessage("Unable to load your profile. Refresh the page before saving.");
        }
      } finally {
        if (!cancelled) setIsProfileLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateProfile(field: Exclude<keyof typeof initialProfile, "pastProjects">, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function updateProject(
    index: number,
    field: Exclude<keyof ProjectRow, "urls">,
    value: string,
  ) {
    setProfile((current) => ({
      ...current,
      pastProjects: current.pastProjects.map((project, row) =>
        row === index ? { ...project, [field]: value } : project,
      ),
    }));
  }

  function addProjectUrl(index: number, raw = draftUrl) {
    if (urlCommitted.current) return;
    urlCommitted.current = true;
    const url = raw.trim();
    if (url) {
      setProfile((current) => ({
        ...current,
        pastProjects: current.pastProjects.map((project, row) => {
          if (row !== index) return project;
          if (project.urls.some((item) => item.toLowerCase() === url.toLowerCase())) {
            return project;
          }
          return { ...project, urls: [...project.urls, url] };
        }),
      }));
    }
    setDraftUrl("");
    setAddingUrlIndex(null);
  }

  function removeProjectUrl(index: number, url: string) {
    setProfile((current) => ({
      ...current,
      pastProjects: current.pastProjects.map((project, row) =>
        row === index
          ? {
              ...project,
              urls: project.urls.filter(
                (item) => item.toLowerCase() !== url.toLowerCase(),
              ),
            }
          : project,
      ),
    }));
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
    if (isSaving || isProfileLoading || profileLoadFailed || Object.values(checkingCertificates).some(Boolean)) return;
    setIsSaving(true);
    setSaveMessage("");
    setSaveFailed(false);

    try {
      const projects = profile.pastProjects.filter(projectHasContent);
      for (const [index, project] of projects.entries()) {
        if (!project.name.trim() || !project.description.trim() ||
            project.budget.trim() === "" || !Number.isFinite(Number(project.budget)) ||
            Number(project.budget) < 0 || !["true", "false"].includes(project.isGovernment)) {
          throw new Error(`Past project row ${index + 1}: enter a name, description, non-negative budget, and project sector.`);
        }
        if (project.completedAt.trim() && !displayToIsoDate(project.completedAt)) {
          throw new Error(
            `Past project row ${index + 1}: completed date must be dd/mm/yyyy.`,
          );
        }
      }
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
        pastProjects: projects.map((project) => ({
          name: project.name.trim(),
          description: project.description.trim(),
          budget: Number(project.budget),
          isGovernment: project.isGovernment === "true",
          completedAt: displayToIsoDate(project.completedAt) || null,
          urls: project.urls,
        })),
        website: profile.website,
        companyPhone: profile.companyPhone,
        bio: profile.bio,
        location: profile.location,
      };

      const hasExistingProfile = Boolean(existingProfile?._id);

      const form = new FormData();
      const retainedPaths = Object.fromEntries(Object.entries(certificates).map(([field, entries]) => [
        field, entries.flatMap((entry) => entry.path ? [entry.path] : []),
      ]));
      form.append("profile", JSON.stringify({ ...submittedProfile, ...retainedPaths }));
      for (const [field, entries] of Object.entries(certificates)) {
        for (const entry of entries) {
          if (entry.file) form.append(field, entry.file, entry.file.name);
        }
      }
      const saved = await api<NonNullable<SavedProfile>>(
        hasExistingProfile
          ? `/vendor-profiles/${existingProfile?._id}`
          : "/vendor-profiles",
        {
          method: hasExistingProfile ? "PATCH" : "POST",
          body: form,
        },
      );
      setCertificates(savedCertificateSelections(saved));

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
        <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
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
                <div className="flex flex-col gap-3 sm:col-span-2">
                  <h3 className="text-base font-medium leading-snug">
                    Similar past work
                  </h3>
                  <div className="flex flex-col gap-4">
                    {profile.pastProjects.map((project, index) => (
                      <div key={index} className={projectFrostCard}>
                        {profile.pastProjects.length > 1 ? (
                          <button
                            type="button"
                            aria-label={`Remove project ${index + 1}`}
                            className={cn(
                              frostPill,
                              frostPillDanger,
                              "absolute top-3 right-3 size-7 shrink-0 px-0 md:top-4 md:right-4",
                            )}
                            onClick={() =>
                              setProfile((current) => ({
                                ...current,
                                pastProjects: current.pastProjects.filter(
                                  (_, row) => row !== index,
                                ),
                              }))
                            }
                          >
                            <HugeiconsIcon
                              icon={Cancel01Icon}
                              className="size-3.5"
                            />
                          </button>
                        ) : null}
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="mt-4 flex flex-col gap-1.5 md:col-span-3">
                            <label
                              htmlFor={`project-name-${index}`}
                              className="text-sm font-medium"
                            >
                              Project name
                            </label>
                            <Input
                              id={`project-name-${index}`}
                              aria-label={`Project ${index + 1} name`}
                              className={fieldClass}
                              value={project.name}
                              onChange={(event) =>
                                updateProject(index, "name", event.target.value)
                              }
                            />
                          </div>
                          <div className="flex flex-col gap-1.5 md:col-span-3">
                            <label
                              htmlFor={`project-description-${index}`}
                              className="text-sm font-medium"
                            >
                              Short description
                            </label>
                            <textarea
                              id={`project-description-${index}`}
                              data-project-description=""
                              aria-label={`Project ${index + 1} short description`}
                              rows={2}
                              className={cn(
                                "w-full min-h-[2.75rem] rounded-[6px] border-0 bg-white px-3.5 py-2 text-sm shadow-none ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_32%,transparent)] outline-none resize-y overflow-hidden focus-visible:ring-[color-mix(in_srgb,var(--palette-teal-400)_45%,transparent)]",
                              )}
                              value={project.description}
                              onChange={(event) => {
                                const node = event.currentTarget;
                                updateProject(
                                  index,
                                  "description",
                                  event.target.value,
                                );
                                fitTextBox(node);
                              }}
                              onInput={(event) =>
                                fitTextBox(event.currentTarget)
                              }
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label
                              htmlFor={`project-budget-${index}`}
                              className="text-sm font-medium"
                            >
                              Budget (THB)
                            </label>
                            <Input
                              id={`project-budget-${index}`}
                              aria-label={`Project ${index + 1} budget in THB`}
                              type="number"
                              min="0"
                              step="0.01"
                              className={cn(
                                frostField,
                                "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                              )}
                              value={project.budget}
                              onChange={(event) =>
                                updateProject(
                                  index,
                                  "budget",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium">
                              Project sector
                            </span>
                            <Select
                              value={project.isGovernment || undefined}
                              onValueChange={(value) =>
                                updateProject(index, "isGovernment", value)
                              }
                            >
                              <SelectTrigger
                                aria-label={`Project ${index + 1} sector`}
                                className={cn(frostField, "justify-between", "text-md")}
                              >
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Government</SelectItem>
                                <SelectItem value="false">Private</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label
                              htmlFor={`project-completed-${index}`}
                              className="text-sm font-medium"
                            >
                              Completed date (optional)
                            </label>
                            <Input
                              id={`project-completed-${index}`}
                              aria-label={`Project ${index + 1} completed date (optional)`}
                              type="text"
                              inputMode="numeric"
                              placeholder="dd/mm/yyyy"
                              autoComplete="off"
                              className={frostField}
                              value={project.completedAt}
                              onChange={(event) =>
                                updateProject(
                                  index,
                                  "completedAt",
                                  event.target.value,
                                )
                              }
                              onBlur={(event) => {
                                const raw = event.target.value.trim();
                                if (!raw) return;
                                const iso = displayToIsoDate(raw);
                                if (iso) {
                                  updateProject(
                                    index,
                                    "completedAt",
                                    isoToDisplayDate(iso),
                                  );
                                }
                              }}
                            />
                          </div>
                          <div className="flex flex-col gap-2 md:col-span-3">
                            <span className="text-sm font-medium">
                              Project URLs
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {project.urls.map((url) => (
                                <button
                                  key={url}
                                  type="button"
                                  aria-label={`Remove ${url}`}
                                  onClick={() => removeProjectUrl(index, url)}
                                  className={cn(frostPill, frostPillIdle, "gap-1.5")}
                                >
                                  <span className="max-w-[14rem] truncate">
                                    {url}
                                  </span>
                                  <HugeiconsIcon
                                    icon={Cancel01Icon}
                                    strokeWidth={2}
                                    className="size-3.5 shrink-0"
                                  />
                                </button>
                              ))}
                              {addingUrlIndex === index ? (
                                <input
                                  autoFocus
                                  aria-label={`Project ${index + 1} URL`}
                                  value={draftUrl}
                                  placeholder="https://"
                                  onChange={(event) =>
                                    setDraftUrl(event.target.value)
                                  }
                                  onBlur={(event) =>
                                    addProjectUrl(index, event.currentTarget.value)
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      addProjectUrl(
                                        index,
                                        event.currentTarget.value,
                                      );
                                    }
                                    if (event.key === "Escape") {
                                      urlCommitted.current = true;
                                      setDraftUrl("");
                                      setAddingUrlIndex(null);
                                    }
                                  }}
                                  className={cn(fieldClass, "w-56")}
                                />
                              ) : (
                                <button
                                  type="button"
                                  aria-label={`Add URL for project ${index + 1}`}
                                  onClick={() => {
                                    urlCommitted.current = false;
                                    setDraftUrl("");
                                    setAddingUrlIndex(index);
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
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      size="sm"
                      className={cn(frostButton, "h-8 gap-1.5 px-3 text-xs")}
                      onClick={() =>
                        setProfile((current) => ({
                          ...current,
                          pastProjects: [
                            ...current.pastProjects,
                            emptyProject(),
                          ],
                        }))
                      }
                    >
                      <HugeiconsIcon
                        icon={PlusSignIcon}
                        className="size-3.5"
                      />
                      Add project
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={profileCard}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold leading-snug tracking-tight">
                Certificates
              </CardTitle>
              <CardDescription>
                Add your credentials in the relevant category. Choose up to 5 PNG images for each certificate type.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CertificateUploads
                value={certificates}
                disabled={isSaving || isProfileLoading || profileLoadFailed}
                onChange={(category, entries) => setCertificates((current) => ({ ...current, [category]: entries }))}
                onBusyChange={(category, busy) => setCheckingCertificates((current) => ({ ...current, [category]: busy }))}
              />
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
              type="submit"
              className={frostButton}
              disabled={isSaving || isProfileLoading || profileLoadFailed || Object.values(checkingCertificates).some(Boolean)}
            >
              {isSaving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
