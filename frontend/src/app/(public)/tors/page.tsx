import type { Metadata } from "next";

import { TorBrowse } from "@/components/tor/tor-browse";
import { parseAgencyId } from "@/config/agencies";
import { MOCK_TORS } from "@/data/mock";

export const metadata: Metadata = {
  title: "TORs",
};

type Props = {
  searchParams: Promise<{ q?: string; agency?: string }>;
};

export default async function TorsPage({ searchParams }: Props) {
  const { q, agency } = await searchParams;

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:space-y-12 md:py-16">
      <TorBrowse
        tors={MOCK_TORS}
        initialQuery={q ?? ""}
        initialAgency={parseAgencyId(agency)}
      />
    </div>
  );
}
