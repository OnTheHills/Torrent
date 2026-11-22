import type { QueryClient } from "@tanstack/react-query";

export const SESSION_EXPIRED_EVENT = "torrent:session-expired";

export async function clearSessionCache(client: QueryClient) {
  await client.cancelQueries().catch(() => undefined);
  client.clear();
}
