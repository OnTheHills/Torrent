/**
 * Allow only same-origin relative paths for client-side redirects (ASVS V3.7.2).
 */
export function safeAppPath(value: string | undefined, fallback = "/"): string {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return fallback;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
    return fallback;
  }
  try {
    const parsed = new URL(raw, "https://torrent.invalid");
    if (parsed.origin !== "https://torrent.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
  } catch {
    return fallback;
  }
}
