import { probeSources } from "@/lib/sources/probe";

export const dynamic = "force-dynamic";

export async function GET() {
  const results = await probeSources();
  const summary = {
    green: results.filter((item) => item.verdict === "green").length,
    yellow: results.filter((item) => item.verdict === "yellow").length,
    red: results.filter((item) => item.verdict === "red").length,
    scrapeRequired: results.some((item) => item.kind === "html"),
    strategy:
      "BMA OCDS JSON, MDES e-GP RSS, public HTML listings for DGA / depa / Labour. Skip login-walled or JS-only e-GP.",
  };

  return Response.json({ probedAt: new Date().toISOString(), summary, results });
}
