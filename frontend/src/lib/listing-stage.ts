export const LISTING_STAGES = [
  "open",
  "closing",
  "draft",
  "closed",
  "awarded",
  "cancelled",
] as const;

export type ListingStage = (typeof LISTING_STAGES)[number];

const STAGE_SET = new Set<string>(LISTING_STAGES);
const SOURCE_TIME_ZONE = "Asia/Bangkok";

export function bangkokToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SOURCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function daysUntil(deadline: string, today: string) {
  const [year, month, day] = deadline.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  if (!year || !month || !day || !todayYear || !todayMonth || !todayDay) return null;
  return Math.round(
    (Date.UTC(year, month - 1, day) - Date.UTC(todayYear, todayMonth - 1, todayDay)) /
      86_400_000,
  );
}

// Deadline splits an open notice into open, closing soon, or closed.
// Draft, winner, and cancelled stay their own stages.
export function listingStage(
  tor: { lifecycle: string; deadline?: string },
  today = bangkokToday(),
): ListingStage {
  if (tor.lifecycle === "cancelled") return "cancelled";
  if (tor.lifecycle === "awarded") return "awarded";
  if (tor.lifecycle === "draft") return "draft";

  const days = tor.deadline ? daysUntil(tor.deadline, today) : null;
  if (days === null) return "open";
  if (days < 0) return "closed";
  if (days <= 7) return "closing";
  return "open";
}

const FIT_SCORE_STAGES = new Set<ListingStage>(["open", "closing", "draft"]);

export function fitScoreApplies(tor: { lifecycle: string; deadline?: string }) {
  return FIT_SCORE_STAGES.has(listingStage(tor));
}

export function parseListingStages(values: string[]): ListingStage[] {
  return [...new Set(values.filter((item): item is ListingStage => STAGE_SET.has(item)))];
}
