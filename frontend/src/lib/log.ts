export function logClientError(event: string) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "error",
    service: "torrent-frontend",
    event: event.replace(/[\r\n\u2028\u2029]/g, " "),
  }));
}
