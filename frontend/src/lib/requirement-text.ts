/** Strip OCR/doc list markers so UI bullets aren't doubled with stale numbering. */
const LEADING_LIST_MARKER =
  /^(?:\(\s*[0-9๐-๙]{1,2}\s*\)|[0-9๐-๙]{1,2}[.)]|ข้อ(?:ที่)?\s*[0-9๐-๙]{1,2}[.)]?)\s+/u;

export function stripLeadingListMarker(text: string): string {
  return String(text || "")
    .trim()
    .replace(LEADING_LIST_MARKER, "")
    .trim();
}
