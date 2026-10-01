const {
  ANNOUNCE_URL,
  FILE_ORIGIN,
  PROJECT_URL,
  USER_AGENT,
} = require("@/constants/bmaConstants");
const { parseDate } = require("@/utils/torUtils");

function projectIdFromUrl(egpUrl) {
  const value = String(egpUrl || "");
  if (!value.startsWith(PROJECT_URL)) return "";
  return value.slice(PROJECT_URL.length).replace(/^\/+/, "").split("/")[0] || "";
}

function announcementFileUrl(announcementId, fileName) {
  const id = String(announcementId || "").trim();
  const name = String(fileName || "").trim();
  if (!id || !name) return "";
  if (/^https?:\/\//i.test(name)) return name;
  if (name.startsWith("Uploads")) {
    return `https://adminapiegp.bangkok.go.th/${name
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")}`;
  }
  return `${FILE_ORIGIN}/api/file/${encodeURIComponent(id)}/${encodeURIComponent(name)}`;
}

function announceKind(name) {
  const value = String(name || "");
  if (/ร่างขอบเขต|TOR/i.test(value)) return "tor";
  if (/เชิญชวน|ร่างเอกสารประกวดราคา|e-Bidding/i.test(value)) return "open";
  if (/ผู้ชนะ|ได้รับการคัดเลือก/.test(value)) return "winner";
  return "other";
}

async function fetchAnnouncements(projectId) {
  const url = new URL(ANNOUNCE_URL);
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("pageSize", "30");
  const response = await fetch(url, {
    headers: {
      Accept: "application/json, text/plain, */*",
      Referer: `${PROJECT_URL}/${projectId}`,
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok) throw new Error(`BMA project announcements failed (${response.status})`);
  const result = await response.json();
  return result.data || [];
}

function pickTorAnnouncement(announcements = []) {
  return (
    announcements.find((row) => announceKind(row.masterAnnounceTypeName) === "tor") ||
    announcements.find((row) => announceKind(row.masterAnnounceTypeName) === "open") ||
    announcements[0]
  );
}

function datesFromAnnouncements(announcements = []) {
  const dates = announcements
    .map((row) => parseDate(row.projectAnnouncementPublishDate))
    .filter(Boolean)
    .sort((a, b) => a - b);
  return dates[0];
}

function statusFromAnnouncements(announcements = [], fallback = "published") {
  if (announcements.some((row) => announceKind(row.masterAnnounceTypeName) === "winner")) {
    return "awarded";
  }
  if (announcements.some((row) => announceKind(row.masterAnnounceTypeName) === "open")) {
    return "published";
  }
  if (announcements.some((row) => announceKind(row.masterAnnounceTypeName) === "tor")) {
    return "draft";
  }
  return fallback;
}

async function downloadAnnouncementPdf(fileUrl, projectId) {
  const response = await fetch(fileUrl, {
    headers: {
      Accept: "application/pdf,*/*",
      Referer: `${PROJECT_URL}/${projectId}`,
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok) throw new Error(`BMA TOR PDF failed (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 5 || bytes.subarray(0, 4).toString() !== "%PDF") {
    throw new Error("BMA TOR PDF was not a PDF");
  }
  return bytes;
}

async function hydrateProjects(tors = []) {
  const hydrated = [];
  for (const tor of tors) {
    const projectId = projectIdFromUrl(tor.egpUrl);
    if (!projectId) {
      hydrated.push(tor);
      continue;
    }
    try {
      const announcements = await fetchAnnouncements(projectId);
      hydrated.push({
        ...tor,
        publishedAt: datesFromAnnouncements(announcements) || tor.publishedAt,
        status: statusFromAnnouncements(announcements, tor.status),
      });
    } catch (error) {
      console.error(`BMA project hydrate ${projectId}: ${error.message}`);
      hydrated.push(tor);
    }
  }
  return hydrated;
}

module.exports = {
  announcementFileUrl,
  announceKind,
  downloadAnnouncementPdf,
  fetchAnnouncements,
  hydrateProjects,
  pickTorAnnouncement,
  projectIdFromUrl,
};
