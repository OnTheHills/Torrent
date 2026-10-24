import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PDF_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

function backendApiBase() {
  const base =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5175/api";
  return base.replace(/\/+$/, "");
}

function isAllowedPdfHost(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.endsWith("gprocurement.go.th") ||
      host.endsWith("bangkok.go.th") ||
      host.endsWith("egp.go.th") ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

const TH_MONTHS: Record<string, string> = {
  มกราคม: "Jan",
  กุมภาพันธ์: "Feb",
  มีนาคม: "Mar",
  เมษายน: "Apr",
  พฤษภาคม: "May",
  มิถุนายน: "Jun",
  กรกฎาคม: "Jul",
  สิงหาคม: "Aug",
  กันยายน: "Sep",
  ตุลาคม: "Oct",
  พฤศจิกายน: "Nov",
  ธันวาคม: "Dec",
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"');
}

function stripHtmlToText(html: string) {
  return decodeHtmlEntities(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatThaiMoment(chunk: string) {
  const match = chunk.match(
    /ที่\s*(\d{1,2})\s*([ก-๙]+)\s*(\d{4})\s*เวลา\s*(\d{1,2})[.:](\d{2})/,
  );
  if (!match) return chunk.trim();
  const [, day, monthTh, year, hour, minute] = match;
  const month = TH_MONTHS[monthTh] || monthTh;
  return `${day} ${month} ${year}, ${hour.padStart(2, "0")}:${minute}`;
}

/** Prefer a concrete e-GP outage window when upstream returns HTML instead of a PDF. */
function messageFromNonPdfBody(raw: string) {
  const text = stripHtmlToText(raw);
  const maintenance =
    /ปิดระบบ|maintenance|ชั่วคราว/i.test(text) ||
    /แจ้งปิดระบบ\s*e\s*-?\s*GP/i.test(text);
  if (!maintenance) return "Upstream did not return a PDF.";

  const untilMatch = text.match(
    /-\s*(วัน[ก-๙]*ที่\s*\d{1,2}\s*[ก-๙]+\s*\d{4}\s*เวลา\s*\d{1,2}[.:]\d{2}\s*น\.)/,
  );
  const resumeMatch = text.match(
    /เปิดใช้งานอีกครั้ง\s*(?:ใน)?\s*(วัน[ก-๙]*ที่\s*\d{1,2}\s*[ก-๙]+\s*\d{4}\s*เวลา\s*\d{1,2}[.:]\d{2}\s*น\.)/,
  );

  if (untilMatch?.[1] && resumeMatch?.[1]) {
    return `e-GP temporary maintenance until ${formatThaiMoment(untilMatch[1])}. Resumes ${formatThaiMoment(resumeMatch[1])}.`;
  }
  if (resumeMatch?.[1]) {
    return `e-GP temporary maintenance. Resumes ${formatThaiMoment(resumeMatch[1])}.`;
  }
  if (untilMatch?.[1]) {
    return `e-GP temporary maintenance until ${formatThaiMoment(untilMatch[1])}.`;
  }
  return "e-GP is under temporary maintenance, so the PDF is unavailable.";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id || !/^[a-f0-9]{24}$/i.test(id)) {
    return Response.json({ message: "Invalid TOR id." }, { status: 400 });
  }

  const jar = await cookies();
  const session = jar.get("torrent_session")?.value;
  if (!session) {
    return Response.json({ message: "Not signed in." }, { status: 401 });
  }

  const torResponse = await fetch(`${backendApiBase()}/admin/tors/${id}`, {
    headers: { cookie: `torrent_session=${session}` },
    cache: "no-store",
  });
  if (!torResponse.ok) {
    const body = await torResponse.json().catch(() => ({}));
    return Response.json(
      {
        message:
          typeof body === "object" && body && "message" in body
            ? String((body as { message: string }).message)
            : "Could not load TOR.",
      },
      { status: torResponse.status },
    );
  }

  const tor = (await torResponse.json()) as { pdfUrl?: string };
  const pdfUrl = String(tor.pdfUrl || "").trim();
  if (!pdfUrl) {
    return Response.json({ message: "No PDF attached to this TOR." }, { status: 404 });
  }
  if (!isAllowedPdfHost(pdfUrl)) {
    return Response.json({ message: "PDF host is not allowed." }, { status: 400 });
  }

  // Fetch on the Next.js host (not the Docker backend) so DNS/WAF work for e-GP.
  let upstream: Response;
  try {
    upstream = await fetch(pdfUrl, {
      headers: {
        Accept: "application/pdf,*/*",
        "User-Agent": PDF_USER_AGENT,
      },
      redirect: "follow",
      cache: "no-store",
    });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error ? error.message : "Could not reach the PDF host.",
      },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return Response.json(
      { message: `Could not fetch PDF (${upstream.status}).` },
      { status: 502 },
    );
  }

  const bytes = Buffer.from(await upstream.arrayBuffer());
  if (bytes.subarray(0, 5).toString() !== "%PDF-") {
    const body = bytes.toString("utf8", 0, Math.min(bytes.length, 8000));
    return Response.json(
      { message: messageFromNonPdfBody(body) },
      { status: 502 },
    );
  }

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="tor.pdf"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
