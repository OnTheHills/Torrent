import { api } from "@/lib/api";

export type LineStatus = {
  linked: boolean;
  digestEnabled: boolean;
  linkedAt: string | null;
  pendingCode: string | null;
  pendingExpiresAt: string | null;
  oaAddUrl: string | null;
  instructions?: string;
};

export function getLineStatus() {
  return api<LineStatus>("/api/line/status");
}

export function startLineLink() {
  return api<LineStatus>("/api/line/link/start", { method: "POST" });
}

export function unlinkLine() {
  return api<LineStatus>("/api/line/unlink", { method: "POST" });
}

export function setLineDigest(enabled: boolean) {
  return api<LineStatus>("/api/line/digest", {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}
