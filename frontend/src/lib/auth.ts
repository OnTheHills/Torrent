import { api } from "@/lib/api";

export type SessionUser = {
  _id: string;
  email: string;
  role: "public" | "vendor" | "admin";
  firstname?: string;
  lastname?: string;
  username?: string;
  picture?: string;
};

// Google returns a short-lived identity credential. The backend verifies it and
// responds by setting an HTTP-only session cookie, not by exposing a JWT here.
// `nonce` must match the value passed to GIS initialize() (ASVS V10.1.2).
export function googleLogin(
  credential: string,
  role?: "public" | "vendor",
  nonce?: string,
) {
  const body: Record<string, string> = { credential };
  if (role) body.role = role;
  if (nonce) body.nonce = nonce;
  return api<SessionUser>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getMe() {
  return api<SessionUser>("/api/auth/me");
}

export function logout() {
  return api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}
