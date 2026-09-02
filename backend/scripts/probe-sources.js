const UA =
  "TORRENT-CSP/0.1 (university research probe; official feeds and public listings)";

const OCDS_JSON =
  "https://opencontract.bangkok.go.th/assets/data/output/yearly/ocds_releases_2569.json";
const EGP2_PLAN_API =
  "https://egp2.bangkok.go.th/appapi/api/PlanProjects/GetPlanProjectFromFilter?pageNo=1&pageSize=5&sortBy=announcedatedesc&masterBudgetYearId=2569";
const RSS =
  "https://process3.gprocurement.go.th/EPROCRssFeedWeb/egpannouncerss.xml?deptId=1700&anounceType=B0";
const DGA = "https://www.dga.or.th/procurements/";
const DEPA = "https://www.depa.or.th/procurement/procurement";
const MOL =
  "https://www.mol.go.th/procurement_categories/draft-tor-and-tender-documents";

async function timedFetch(url, init, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": UA, accept: "*/*", ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

function abortDetail(error) {
  if (error && error.name === "AbortError") return "Timed out.";
  return error instanceof Error ? error.message : "Request failed.";
}

async function run() {
  const jobs = [
    (async () => {
      const started = Date.now();
      try {
        const res = await timedFetch(OCDS_JSON, { method: "HEAD" }, 8000);
        return {
          id: "bma-ocds",
          verdict: res.ok ? "green" : "red",
          status: res.status,
          ms: Date.now() - started,
          bytes: res.headers.get("content-length"),
          type: res.headers.get("content-type"),
        };
      } catch (error) {
        return { id: "bma-ocds", verdict: "red", ms: Date.now() - started, detail: abortDetail(error) };
      }
    })(),
    (async () => {
      const started = Date.now();
      try {
        const res = await timedFetch(RSS, { method: "GET" }, 6000);
        const text = await res.text();
        return {
          id: "egp-rss",
          verdict: res.ok && text.includes("<") ? "green" : "yellow",
          status: res.status,
          ms: Date.now() - started,
          items: (text.match(/<item/gi) || []).length,
        };
      } catch (error) {
        return { id: "egp-rss", verdict: "yellow", ms: Date.now() - started, detail: abortDetail(error) };
      }
    })(),
    (async () => {
      const started = Date.now();
      try {
        const res = await timedFetch(DGA, { method: "GET" }, 8000);
        const html = await res.text();
        return {
          id: "dga-html",
          verdict: res.ok && html.includes("จัดซื้อ") ? "green" : "yellow",
          status: res.status,
          ms: Date.now() - started,
        };
      } catch (error) {
        return { id: "dga-html", verdict: "yellow", ms: Date.now() - started, detail: abortDetail(error) };
      }
    })(),
    (async () => {
      const started = Date.now();
      try {
        const res = await timedFetch(DEPA, { method: "GET" }, 8000);
        const html = await res.text();
        return {
          id: "depa-html",
          verdict: res.ok && html.includes("จัดซื้อ") ? "green" : "yellow",
          status: res.status,
          ms: Date.now() - started,
        };
      } catch (error) {
        return { id: "depa-html", verdict: "yellow", ms: Date.now() - started, detail: abortDetail(error) };
      }
    })(),
    (async () => {
      const started = Date.now();
      try {
        const res = await timedFetch(MOL, { method: "GET" }, 8000);
        const html = await res.text();
        return {
          id: "mol-html",
          verdict: res.ok && html.includes("TOR") ? "green" : "yellow",
          status: res.status,
          ms: Date.now() - started,
        };
      } catch (error) {
        return { id: "mol-html", verdict: "yellow", ms: Date.now() - started, detail: abortDetail(error) };
      }
    })(),
    (async () => {
      const started = Date.now();
      try {
        const res = await timedFetch(
          EGP2_PLAN_API,
          {
            method: "GET",
            headers: {
              accept: "application/json, text/plain, */*",
              referer: "https://egp2.bangkok.go.th/plan?budgetYear=2569",
            },
          },
          8000,
        );
        const data = await res.json();
        return {
          id: "bma-egp2-plan-api",
          verdict: res.ok && Array.isArray(data.data) ? "green" : "yellow",
          status: res.status,
          ms: Date.now() - started,
          totalCount: data.totalCount,
        };
      } catch (error) {
        return { id: "bma-egp2-plan-api", verdict: "red", ms: Date.now() - started, detail: abortDetail(error) };
      }
    })(),
  ];

  const results = await Promise.all(jobs);
  const report = {
    probedAt: new Date().toISOString(),
    strategy:
      "BMA e-GP2 PlanProjects API, BMA OCDS, MDES e-GP RSS, public HTML listings for DGA / depa / Labour.",
    results,
  };
  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
