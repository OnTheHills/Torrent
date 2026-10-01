import type { Metadata } from "next";

import { ListingsView } from "@/components/tor/listings-view";
import { parseAgencyId } from "@/config/agencies";
import {
  parseListingLifecycle,
  parseListingSort,
  parseListingSource,
} from "@/types/tor";

export const metadata: Metadata = {
  title: "TORs",
};

type Props = {
  searchParams: Promise<{
    q?: string;
    agency?: string;
    source?: string;
    sort?: string;
    stage?: string;
  }>;
};

export default async function TorsPage({ searchParams }: Props) {
  const { q, agency, source, sort, stage } = await searchParams;
  return (
    <ListingsView
      initialQuery={q ?? ""}
      initialAgency={parseAgencyId(agency)}
      initialSource={parseListingSource(source)}
      initialSort={parseListingSort(sort)}
      initialLifecycle={parseListingLifecycle(stage)}
    />
  );
}
