export type IngestionStatus = "published" | "drafted" | "closed";

export interface IngestionDay {
  date: string;
  published: number;
  drafted: number;
  closed: number;
}

interface IngestionRecord {
  id: string;
  refId?: string;
  source?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
});

function calendarDay(date: Date) {
  const parts = dateFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function category(status?: string): IngestionStatus | undefined {
  switch (status) {
    case "published": return "published";
    case "draft":
    case "discovered": return "drafted";
    case "closed":
    case "awarded":
    case "cancelled": return "closed";
    default: return undefined;
  }
}

/** Daily creations by current stored status, rather than status-change history. */
export function buildTorIngestionDays(records: IngestionRecord[], now = new Date()): IngestionDay[] {
  const unique = new Map<string, { record: IngestionRecord; created: number; updated: number }>();
  for (const record of records) {
    const created = record.createdAt ? Date.parse(record.createdAt) : NaN;
    if (!Number.isFinite(created)) continue;
    // Match the backend ingestion identity; never merge different sources or
    // unrelated manual records that do not have a source/refId pair.
    const key = record.source && record.refId
      ? JSON.stringify([record.source, record.refId]) : JSON.stringify([record.id]);
    const updated = Date.parse(record.updatedAt || record.createdAt!) || created;
    const previous = unique.get(key);
    if (!previous) unique.set(key, { record, created, updated });
    else {
      previous.created = Math.min(previous.created, created);
      if (updated > previous.updated || (updated === previous.updated && record.id > previous.record.id)) {
        previous.record = record;
        previous.updated = updated;
      }
    }
  }

  const byDay = new Map<string, IngestionDay>();
  for (const { record, created } of unique.values()) {
    const status = category(record.status);
    if (!status) continue; // Unknown statuses are not silently relabelled.
    const date = calendarDay(new Date(created));
    const day = byDay.get(date) ?? { date, published: 0, drafted: 0, closed: 0 };
    day[status]++;
    byDay.set(date, day);
  }
  if (!byDay.size) return [];

  const dates = [...byDay.keys()].sort();
  const today = calendarDay(now);
  const end = dates.at(-1)! > today ? dates.at(-1)! : today;
  const days: IngestionDay[] = [];
  // Day keys already represent Bangkok dates; UTC arithmetic avoids host timezone effects.
  const cursor = new Date(`${dates[0]}T00:00:00Z`);
  while (cursor.toISOString().slice(0, 10) <= end) {
    const date = cursor.toISOString().slice(0, 10);
    days.push(byDay.get(date) ?? { date, published: 0, drafted: 0, closed: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
