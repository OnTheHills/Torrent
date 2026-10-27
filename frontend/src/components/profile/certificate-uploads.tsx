"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Cancel01Icon, PlusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const categories = [
  {
    id: "securityCertificates",
    title: "Security certificate",
    description: "Cybersecurity, information security, or security compliance.",
    example: "e.g. ISO 27001, CISSP, or CompTIA Security+",
  },
  {
    id: "aiCertificates",
    title: "AI certificate",
    description: "Artificial intelligence, machine learning, or responsible AI.",
    example: "e.g. AI engineering or machine learning certification",
  },
  {
    id: "otherCertificates",
    title: "Other certificate",
    description: "Any additional professional or industry certification.",
    example: "e.g. cloud, project management, or quality assurance",
  },
] as const;

export type CertificateField = (typeof categories)[number]["id"];
export type CertificateEntry = { name: string; preview: string; size?: number; file?: File; path?: string };
export type CertificateSelections = Record<CertificateField, CertificateEntry[]>;
export const emptyCertificates = (): CertificateSelections => ({ securityCertificates: [], aiCertificates: [], otherCertificates: [] });

export function savedCertificateSelections(profile: Partial<Record<CertificateField, string[]>>): CertificateSelections {
  return Object.fromEntries(categories.map(({ id }) => [id, (profile[id] ?? []).map((path) => ({
    path,
    name: path.split("/").pop() ?? path,
    preview: apiUrl(`/vendor-profiles/certificates/${encodeURIComponent(path.split("/").pop() ?? "")}`),
  }))])) as CertificateSelections;
}

type UploadProps = {
  value: CertificateSelections;
  disabled: boolean;
  onChange: (category: CertificateField, entries: CertificateEntry[]) => void;
  onBusyChange: (category: CertificateField, busy: boolean) => void;
};

const MAX_CERTIFICATES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

function readPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Unable to read this file. Please try again."));
    reader.onabort = () => reject(new Error("File selection was cancelled. Please try again."));
    reader.readAsDataURL(file);
  });
}

function CertificateUpload({ category, index, entries, disabled, onChange, onBusyChange }: {
  category: (typeof categories)[number];
  index: number;
  entries: CertificateEntry[];
} & Omit<UploadProps, "value">) {
  const inputRef = useRef<HTMLInputElement>(null);
  const processing = useRef(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputId = `certificate-${category.id}`;
  const locked = disabled || busy;

  async function selectFile(files: FileList | null) {
    if (disabled || processing.current || !files?.length) return;
    setError("");
    if (entries.length + files.length > MAX_CERTIFICATES) {
      setError("Choose at most 5 PNG certificates per category.");
      return;
    }
    processing.current = true;
    setBusy(true);
    onBusyChange(category.id, true);
    try {
      const selected: CertificateEntry[] = [];
      for (const file of Array.from(files)) {
        if (!/\.png$/i.test(file.name) || (file.type && file.type !== "image/png")) {
          throw new Error("Only PNG files are accepted. Choose .png images.");
        }
        if (file.size > MAX_FILE_SIZE) {
          throw new Error("Each PNG must be no larger than 5 MB.");
        }
        const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
        if (!PNG_SIGNATURE.every((byte, position) => signature[position] === byte)) {
          throw new Error("This file is not a valid PNG. Export your certificate as PNG and try again.");
        }
        let bitmap: ImageBitmap;
        try {
          bitmap = await createImageBitmap(file);
        } catch {
          throw new Error("This PNG cannot be opened. Choose a valid, undamaged PNG image.");
        }
        const tooLarge = bitmap.width > 10000 || bitmap.height > 10000 || bitmap.width * bitmap.height > 16000000;
        bitmap.close();
        if (tooLarge) throw new Error("PNG dimensions must be at most 10,000 pixels per side and 16 megapixels.");
        selected.push({ name: file.name, size: file.size, preview: await readPreview(file), file });
      }
      onChange(category.id, [...entries, ...selected]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open this PNG. Please try again.");
    } finally {
      processing.current = false;
      setBusy(false);
      onBusyChange(category.id, false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col rounded-xl bg-white/75 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_36%,transparent)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--palette-teal-400)_15%,transparent)] text-xs font-semibold text-[var(--palette-teal-800)]">
          0{index + 1}
        </span>
        <span className="text-xs font-medium text-muted-foreground">PNG only</span>
      </div>
      <h3 id={`${inputId}-title`} className="text-base font-semibold">{category.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{category.description}</p>
      <p className="mb-5 mt-2 text-xs leading-relaxed text-muted-foreground">{category.example}</p>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept=".png,image/png"
        className="sr-only"
        tabIndex={-1}
        aria-label={`Upload ${category.title.toLowerCase()}`}
        aria-describedby={`${inputId}-rules${error ? ` ${inputId}-error` : ""}`}
        aria-invalid={Boolean(error)}
        disabled={locked || entries.length >= MAX_CERTIFICATES}
        onChange={(event) => {
          void selectFile(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      <button
        type="button"
        disabled={locked || entries.length >= MAX_CERTIFICATES}
        aria-label={`Upload ${category.title.toLowerCase()}`}
        aria-describedby={`${inputId}-rules${error ? ` ${inputId}-error` : ""}`}
        aria-busy={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = locked ? "none" : "copy";
          if (!locked) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void selectFile(event.dataTransfer.files);
        }}
        className={cn(
          "relative mt-auto flex h-44 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-dashed px-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60",
          dragging
            ? "border-[var(--palette-teal-600)] bg-[color-mix(in_srgb,var(--palette-teal-400)_20%,transparent)]"
            : "border-[var(--palette-gray-300)] bg-white/50 hover:border-[var(--palette-teal-600)] hover:bg-[color-mix(in_srgb,var(--palette-teal-400)_8%,transparent)]",
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
          <HugeiconsIcon icon={PlusSignIcon} className="size-5 text-[var(--palette-teal-800)]" />
        </span>
        <span className="text-sm font-medium">{busy ? "Checking PNGs…" : entries.length >= MAX_CERTIFICATES ? "Category full" : dragging ? "Drop your PNGs here" : "Choose PNG images"}</span>
        <span className="text-xs text-muted-foreground">or drag and drop them here</span>
      </button>
      <p id={`${inputId}-rules`} className="mt-3 text-xs text-muted-foreground">{entries.length} / 5 PNGs · Maximum 5 MB each</p>
      <div className="space-y-4">
        {entries.map((certificate, entryIndex) => (
          <div key={certificate.path ?? `${certificate.name}-${entryIndex}`} className="mt-4 border-t border-border/60 pt-4">
            <a href={certificate.preview} target="_blank" rel="noreferrer" aria-label={`Open ${certificate.name}`} className="relative mb-3 block h-32 rounded-md bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Image src={certificate.preview} alt={`${category.title}: ${certificate.name}`} fill unoptimized sizes="(min-width: 1024px) 280px, 90vw" className="object-contain p-2" />
            </a>
            <div className="flex items-center gap-2 text-sm">
              <HugeiconsIcon icon={Tick02Icon} className="size-4 shrink-0 text-[var(--palette-teal-800)]" />
              <span className="truncate font-medium" title={certificate.name}>{certificate.name}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{certificate.file ? `${((certificate.size ?? 0) / 1024 / 1024).toFixed(2)} MB · Ready to save` : "Saved certificate"}</p>
            <Button type="button" variant="ghost" size="sm" className="mt-2" disabled={locked} onClick={() => { onChange(category.id, entries.filter((_, position) => position !== entryIndex)); setError(""); }} aria-label={`Remove ${certificate.name}`}>
              <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" /> Remove
            </Button>
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">{busy ? "Checking PNGs" : `${entries.length} certificates selected`}</span>
      {error ? <p id={`${inputId}-error`} role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function CertificateUploads({ value, disabled, onChange, onBusyChange }: UploadProps) {
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-3">
        {categories.map((category, index) => <CertificateUpload key={category.id} category={category} index={index} entries={value[category.id]} disabled={disabled} onChange={onChange} onBusyChange={onBusyChange} />)}
      </div>
      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">Click Save profile to save your selected certificates and any removals. You can add up to 5 PNG images in each category.</p>
    </div>
  );
}
