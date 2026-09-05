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
export function googleLogin(credential: string, role?: "public" | "vendor") {
  return api<SessionUser>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify(role ? { credential, role } : { credential }),
  });
}

export function getMe() {
  return api<SessionUser>("/api/auth/me");
}

export function logout() {
  return api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}
