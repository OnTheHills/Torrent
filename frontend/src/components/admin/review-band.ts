/** Shared confidence-band labels for admin Records + Review. */

export function effectiveBand(status: string | undefined, confidence: number) {
  if (status === "manual" || status === "review") return status;
  if (confidence < 80) return "manual";
  if (confidence < 90) return "review";
  if (status === "auto") return "auto";
  return status || "auto";
}

const BAND_LABEL: Record<string, string> = {
  auto: "Ready",
  review: "Glance",
  manual: "Review",
};

export function bandLabel(band: string) {
  return BAND_LABEL[band] || band;
}

export function bandTint(band: string) {
  if (band === "manual") return "var(--palette-red-200)";
  if (band === "review") return "var(--palette-yellow-200)";
  return "var(--palette-gray-200)";
}

/**
 * Fixed label width for all three bands. Sized to the longest labels
 * ("Glance" / "Review" = 6ch) so "Ready" reserves the same space.
 */
export const bandLabelClassName =
  "inline-block min-w-[6ch] whitespace-nowrap";
