import type { Metadata } from "next";

import { ListingsView } from "@/components/tor/listings-view";
import { parseAgencyId } from "@/config/agencies";

export const metadata: Metadata = {
  title: "TORs",
};

type Props = {
  searchParams: Promise<{ q?: string; agency?: string }>;
};

export default async function TorsPage({ searchParams }: Props) {
  const { q, agency } = await searchParams;
  return (
    <ListingsView
      initialQuery={q ?? ""}
      initialAgency={parseAgencyId(agency)}
    />
  );
}
