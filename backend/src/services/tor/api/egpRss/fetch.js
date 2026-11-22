const {
  ANNOUNCE_TYPES,
  API_URLS,
  DEPARTMENTS,
  METHOD,
  RETRY_COUNT,
  SOURCE,
  TIMEOUT_MS,
  USER_AGENT,
} = require("@/constants/egpRssConstants");
const { wait } = require("@/utils/torUtils");
const { decodeRss, parseRssItems } = require("./parse");
const { readBoundedBytes } = require("@/utils/boundedText");
const { errorFields, logger } = require("@/utils/logger");

function feedUrl(base, deptId, announceType) {
  const url = new URL(base);
  url.searchParams.set("deptId", deptId);
  url.searchParams.set("anounceType", announceType);
  return url.toString();
}

function bangkokWindow(now = new Date()) {
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const [hour, minute] = clock.split(":").map(Number);
  const minutes = hour * 60 + minute;
  const closed =
    (minutes >= 9 * 60 && minutes <= 12 * 60) ||
    (minutes >= 13 * 60 && minutes <= 17 * 60);
  return { closed, bangkokTime: clock };
}

function fetchErrorMessage(error) {
  if (error && (error.name === "AbortError" || /aborted/i.test(error.message))) {
    return `Timed out after ${TIMEOUT_MS}ms`;
  }
  return error instanceof Error ? error.message : String(error);
}

async function fetchXml(url) {
  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: METHOD,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml, */*",
          "User-Agent": USER_AGENT,
        },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return decodeRss(await readBoundedBytes(response), response.headers?.get("content-type") || "");
    } catch (error) {
      if (error.code === "UPSTREAM_BODY_TOO_LARGE") throw error;
      if (attempt === RETRY_COUNT) throw new Error(fetchErrorMessage(error));
      await wait(attempt * 1000);
    } finally {
      clearTimeout(timer);
    }
  }
  return "";
}

async function fetchFeed(dept, announceType) {
  const errors = [];
  for (const base of API_URLS) {
    const url = feedUrl(base, dept.id, announceType.code);
    try {
      const xml = await fetchXml(url);
      return {
        url,
        rows: parseRssItems(xml, {
          announceType: announceType.code,
          status: announceType.status,
          deptId: dept.id,
          agencyId: dept.agencyId,
          department: dept.nameTh,
        }),
      };
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }
  throw new Error(errors.join(" | "));
}

async function fetchEgpRss() {
  const rows = [];
  const errors = [];
  const feeds = [];

  await Promise.all(
    DEPARTMENTS.flatMap((dept) =>
      ANNOUNCE_TYPES.map(async (announceType) => {
        try {
          const result = await fetchFeed(dept, announceType);
          feeds.push({
            deptId: dept.id,
            announceType: announceType.code,
            url: result.url,
            items: result.rows.length,
          });
          rows.push(...result.rows);
        } catch (error) {
          errors.push(error.message);
          logger.error("egp_rss.feed_fetch.failed", {
            departmentId: dept.id,
            announceType: announceType.code,
            ...errorFields(error),
          });
        }
      }),
    ),
  );

  return {
    rows,
    metadata: {
      departments: DEPARTMENTS.map((dept) => dept.id),
      announceTypes: ANNOUNCE_TYPES.map((type) => type.code),
      feeds,
      errors,
      window: bangkokWindow(),
    },
  };
}

module.exports = { fetch: fetchEgpRss, fetchEgpRss, method: METHOD, source: SOURCE };
