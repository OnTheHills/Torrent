/** Build a CSP string for the Next.js UI (GIS allowlisted; SRI not viable for Google's rotating GSI bundle). */
export function buildContentSecurityPolicy(nonce: string) {
  const apiOrigins = [
    process.env.NEXT_PUBLIC_API_URL,
    process.env.BACKEND_API_URL,
    "http://localhost:5175",
    "http://127.0.0.1:5175",
  ]
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(String(value)).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const connectSrc = Array.from(
    new Set(["'self'", "https://accounts.google.com", ...apiOrigins]),
  ).join(" ");

  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "https://accounts.google.com",
    // Next.js Fast Refresh / some GIS helpers evaluate in development only.
    isDev ? "'unsafe-eval'" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-src https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
