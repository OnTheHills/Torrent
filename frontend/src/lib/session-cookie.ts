/** Session cookie names used by the Express backend (local vs Host-prefixed). */
export const SESSION_COOKIE_BASE = "torrent_session";
export const HOST_SESSION_COOKIE = `__Host-${SESSION_COOKIE_BASE}`;
export const SESSION_COOKIE_CANDIDATES = [
  HOST_SESSION_COOKIE,
  SESSION_COOKIE_BASE,
] as const;

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

/** Prefer the Host-prefixed cookie when both are present. */
export function readSessionCookie(
  jar: CookieReader,
): { name: string; value: string } | null {
  for (const name of SESSION_COOKIE_CANDIDATES) {
    const value = jar.get(name)?.value;
    if (value) return { name, value };
  }
  return null;
}

/** Build a Cookie header that the backend `readSessionToken` accepts. */
export function sessionCookieHeader(name: string, value: string) {
  return `${name}=${value}`;
}
