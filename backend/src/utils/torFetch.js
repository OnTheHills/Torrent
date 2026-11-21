const dns = require("node:dns/promises");
const { isIP } = require("node:net");
const ipaddr = require("ipaddr.js");
const { Agent } = require("undici");

const HOSTS = {
  egp: [
    "process.gprocurement.go.th",
    "process3.gprocurement.go.th",
    "process5.gprocurement.go.th",
  ],
  bma: ["egp2.bangkok.go.th", "adminapiegp.bangkok.go.th"],
};

const UUID = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;

function allowedQuery(url, key, pattern) {
  const entries = [...url.searchParams];
  return entries.length === 1 && entries[0][0] === key && pattern.test(entries[0][1]);
}

function allowedPath(url, raw, source) {
  // Check original segments too: WHATWG URL parsing normalizes dot segments.
  const rawPath = raw.match(/^https:\/\/[^/?#]+([^?#]*)/i)?.[1] || "/";
  let segments;
  try { segments = rawPath.split("/").map(decodeURIComponent); } catch { return false; }
  if (segments.some((part) => part === "." || part === ".." || /[/%\\?#\u0000-\u001f\u007f]/u.test(part))) return false;
  const path = segments.join("/");

  if (source === "egp-api") {
    return url.hostname === "process5.gprocurement.go.th" &&
      /^\/egp-oann10-service\/pb\/a-egp-allt-project\/announcement\/(?:getProjectDetail|getProcurementDetail)$/.test(path) &&
      allowedQuery(url, "projectId", /^\d{11}$/);
  }
  if (url.hostname === "process5.gprocurement.go.th") {
    if (path === "/egp-upload-service/v1/downloadFileTest") {
      return allowedQuery(url, "fileId", /^[a-f\d]{32}$/i);
    }
    return path === "/egp-template-service/dwnt/view-pdf-file" && allowedQuery(url, "templateId", UUID);
  }
  if (url.search) return false;
  if (url.hostname === "egp2.bangkok.go.th") {
    return segments.length === 5 && segments[1] === "api" && segments[2] === "file" &&
      UUID.test(segments[3]) && /^[^/]+\.pdf$/i.test(segments[4]);
  }
  return url.hostname === "adminapiegp.bangkok.go.th" && segments[1] === "Uploads" &&
    segments.length >= 3 && segments.slice(2).every(Boolean) && /\.pdf$/i.test(path);
}

function validateTorUrl(value, source = "all") {
  const denied = () => Object.assign(new Error("TOR destination is not allowed."), { statusCode: 400 });
  const raw = value instanceof URL ? value.href : value;
  // Reject characters that URL parsers might silently remove or reinterpret.
  if (typeof raw !== "string" || /[\s\\\u0000-\u001f\u007f]/u.test(raw)) throw denied();
  let url;
  try { url = new URL(raw); } catch { throw denied(); }
  const hosts = source === "all" ? [...HOSTS.egp, ...HOSTS.bma] :
    source === "egp-api" ? HOSTS.egp : HOSTS[source];
  // URL normalizes explicit :443 to an empty port, so both forms are allowed.
  if (!hosts?.includes(url.hostname) || url.protocol !== "https:" || url.port ||
      url.username || url.password || url.hash) throw denied();
  if (!allowedPath(url, raw, source)) throw denied();
  return url;
}

function isPublicAddress(address) {
  if (!isIP(address)) return false;
  const parsed = ipaddr.parse(address);
  // Mapped, NAT64 and transition addresses are rejected too: they can conceal
  // an IPv4 destination. Only ordinary public unicast addresses are accepted.
  return parsed.range() === "unicast" &&
    (parsed.kind() === "ipv4" || parsed.match(ipaddr.parse("2000::"), 3));
}

async function resolveTorDestination(value, source = "all") {
  const url = validateTorUrl(value, source);
  let timer;
  let records;
  try {
    records = await Promise.race([
      dns.lookup(url.hostname, { all: true, verbatim: true }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("TOR DNS lookup timed out.")), 10000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  // Reject the whole answer if any address is unsafe; never fall back to an
  // unchecked AAAA record or another address from a mixed public/private answer.
  if (!records.length || records.some(({ address, family }) =>
    !isPublicAddress(address) || isIP(address) !== family)) {
    throw Object.assign(new Error("TOR host resolved to a non-public address."), { statusCode: 400 });
  }
  const record = records.find(({ family }) => family === 4) || records[0];
  return { url, ...record };
}

function pinnedLookup(destination) {
  return (hostname, options, callback) => {
    if (hostname !== destination.url.hostname) return callback(new Error("Unexpected TOR connection host."));
    const record = { address: destination.address, family: destination.family };
    if (options.all) callback(null, [record]);
    else callback(null, record.address, record.family);
  };
}

function curlDestinationArgs(destination) {
  const address = destination.family === 6 ? `[${destination.address}]` : destination.address;
  // Proxies could resolve the hostname again, bypassing the validated address.
  return ["--noproxy", "*", "--resolve", `${destination.url.hostname}:443:${address}`];
}

async function fetchTorUrl(value, options = {}, source = "all") {
  const destination = await resolveTorDestination(value, source);
  const dispatcher = new Agent({ connect: { lookup: pinnedLookup(destination) } });
  // A permitted host must not redirect the request outside the allowlist.
  try {
    return await fetch(destination.url, {
      ...options,
      dispatcher,
      redirect: "error",
      signal: options.signal || AbortSignal.timeout(60000),
    });
  } finally {
    // Graceful close waits for the response body to finish; do not destroy it
    // while the caller is still reading a PDF or ZIP.
    void dispatcher.close().catch(() => {});
  }
}

module.exports = {
  validateTorUrl, fetchTorUrl, isPublicAddress, resolveTorDestination,
  pinnedLookup, curlDestinationArgs,
};
