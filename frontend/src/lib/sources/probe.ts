import {
  AGENCIES,
  EGP_RSS_BASE,
  egpRssUrl,
  EGP_RSS_DRAFT,
  type DataSourceKind,
  type SourceVerdict,
} from "@/config/agencies";

const UA =
  "TORRENT-CSP/0.1 (university research probe; official feeds and public listings)";

export interface SourceProbeResult {
  id: string;
  label: string;
  kind: DataSourceKind | "spa-check";
  url: string;
  verdict: SourceVerdict;
  status: number | null;
  ms: number;
  detail: string;
}

async function timedFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": UA,
        accept: "*/*",
        ...(init.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function fail(
  partial: Omit<SourceProbeResult, "verdict" | "status" | "ms" | "detail">,
  ms: number,
  detail: string,
  verdict: SourceVerdict = "red"
): SourceProbeResult {
  return { ...partial, verdict, status: null, ms, detail };
}

export async function probeSources(): Promise<SourceProbeResult[]> {
  return Promise.all([
    probeOcds(),
    probeRss(),
    probeHtmlListing({
      id: "dga-html",
      label: "DGA public procurement listing",
      url: "https://www.dga.or.th/procurements/",
      needle: "จัดซื้อ",
    }),
    probeHtmlListing({
      id: "depa-html",
      label: "depa public procurement listing",
      url: "https://www.depa.or.th/procurement/procurement",
      needle: "จัดซื้อ",
    }),
    probeHtmlListing({
      id: "mol-html",
      label: "MOL draft TOR listing",
      url: "https://www.mol.go.th/procurement_categories/draft-tor-and-tender-documents",
      needle: "TOR",
    }),
    probeBmaHtml(),
  ]);
}

async function probeOcds(): Promise<SourceProbeResult> {
  const url =
    "https://opencontract.bangkok.go.th/assets/data/output/yearly/ocds_releases_2569.json";
  const meta = {
    id: "bma-ocds",
    label: "BMA Open Contracting OCDS JSON",
    kind: "bma-ocds" as const,
    url,
  };
  const started = Date.now();
  try {
    const res = await timedFetch(url, { method: "HEAD" }, 8000);
    const ms = Date.now() - started;
    const bytes = res.headers.get("content-length");
    const type = res.headers.get("content-type") ?? "";
    if (res.ok && (type.includes("json") || url.endsWith(".json"))) {
      const size = bytes ? `${(Number(bytes) / 1_000_000).toFixed(1)} MB, ` : "";
      return {
        ...meta,
        verdict: "green",
        status: res.status,
        ms,
        detail: `Public JSON, ${size}no login. Planning + tender stages included.`,
      };
    }
    return {
      ...meta,
      verdict: res.ok ? "yellow" : "red",
      status: res.status,
      ms,
      detail: `Unexpected response (${type || "no content-type"}).`,
    };
  } catch (error) {
    return fail(meta, Date.now() - started, abortMessage(error));
  }
}

async function probeRss(): Promise<SourceProbeResult> {
  const deptId = AGENCIES.find((agency) => agency.egpDeptId)?.egpDeptId ?? "1700";
  const url = egpRssUrl(deptId, EGP_RSS_DRAFT);
  const meta = {
    id: "egp-rss",
    label: "e-GP official RSS (MDES draft TOR / B0)",
    kind: "egp-rss" as const,
    url,
  };
  const started = Date.now();
  try {
    const res = await timedFetch(url, { method: "GET" }, 6000);
    const ms = Date.now() - started;
    const text = await res.text();
    const items = (text.match(/<item/gi) ?? []).length;
    if (res.ok && (text.includes("<rss") || text.includes("<item"))) {
      return {
        ...meta,
        verdict: "green",
        status: res.status,
        ms,
        detail: `RSS responded with ${items} items. Official republish feed — no HTML scrape.`,
      };
    }
    return {
      ...meta,
      verdict: "yellow",
      status: res.status,
      ms,
      detail: `HTTP ${res.status}; body did not look like RSS.`,
    };
  } catch (error) {
    return fail(
      meta,
      Date.now() - started,
      `${abortMessage(error)} Official feed exists (${EGP_RSS_BASE}) but timed out from this network — scrape mdes.go.th/procurement as fallback.`,
      "yellow"
    );
  }
}

async function probeHtmlListing(input: {
  id: string;
  label: string;
  url: string;
  needle: string;
}): Promise<SourceProbeResult> {
  const meta = {
    id: input.id,
    label: input.label,
    kind: "html" as const,
    url: input.url,
  };
  const started = Date.now();
  try {
    const res = await timedFetch(input.url, { method: "GET" }, 8000);
    const ms = Date.now() - started;
    const html = await res.text();
    const spa = html.includes("/_next/") || html.includes("__NEXT_DATA__");
    if (spa) {
      return {
        ...meta,
        verdict: "red",
        status: res.status,
        ms,
        detail: "JavaScript-only page — skip. Use another source for this agency.",
      };
    }
    if (res.ok && html.includes(input.needle)) {
      return {
        ...meta,
        verdict: "green",
        status: res.status,
        ms,
        detail: "Public HTML listing is reachable. Filter titles for software TORs.",
      };
    }
    return {
      ...meta,
      verdict: res.ok ? "yellow" : "red",
      status: res.status,
      ms,
      detail: res.ok
        ? "Page loaded but listing markers were not found."
        : `HTTP ${res.status}`,
    };
  } catch (error) {
    return fail(meta, Date.now() - started, abortMessage(error), "yellow");
  }
}

async function probeBmaHtml(): Promise<SourceProbeResult> {
  const url = "https://egp2.bangkok.go.th/";
  const meta = {
    id: "bma-egp2-html",
    label: "BMA e-GP 2 public site (scrape check)",
    kind: "spa-check" as const,
    url,
  };
  const started = Date.now();
  try {
    const res = await timedFetch(url, { method: "GET" }, 8000);
    const ms = Date.now() - started;
    const html = await res.text();
    const spa = html.includes("/_next/") || html.includes("__NEXT_DATA__");
    if (spa) {
      return {
        ...meta,
        verdict: "red",
        status: res.status,
        ms,
        detail:
          "Next.js SPA — listing HTML has no TOR payload. Do not scrape. Use OCDS JSON instead.",
      };
    }
    return {
      ...meta,
      verdict: "yellow",
      status: res.status,
      ms,
      detail: "HTML returned; structure not classified. Prefer OCDS.",
    };
  } catch (error) {
    return fail(meta, Date.now() - started, abortMessage(error));
  }
}

function abortMessage(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    return "Timed out.";
  }
  return error instanceof Error ? error.message : "Request failed.";
}
