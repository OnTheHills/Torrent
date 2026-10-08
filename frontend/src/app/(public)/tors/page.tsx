import type { Metadata } from "next";

import { ListingsView } from "@/components/tor/listings-view";
import { type SourceFilter } from "@/components/tor/tor-filters";
import { TOR_CATEGORIES } from "@/lib/tor-categories";
import { parseAgencyId } from "@/config/agencies";
import { parseListingStages } from "@/lib/listing-stage";
import {
  parseListingSort,
  parseListingSource,
  type AgencyId,
  type IntegrityStatus,
} from "@/types/tor";

export const metadata: Metadata = {
  title: "TORs",
};

type SearchValue = string | string[] | undefined;

type Props = {
  searchParams: Promise<{
    q?: SearchValue;
    agency?: SearchValue;
    category?: SearchValue;
    source?: SearchValue;
    sort?: SearchValue;
    stage?: SearchValue;
    year?: SearchValue;
    integrity?: SearchValue;
  }>;
};

function searchValues(value: SearchValue) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return [
    ...new Set(
      raw.flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean),
    ),
  ];
}

function firstValue(value: SearchValue) {
  return searchValues(value)[0];
}

export default async function TorsPage({ searchParams }: Props) {
  const { q, agency, category, source, sort, stage, year, integrity } = await searchParams;
  const agencies = searchValues(agency).flatMap((item) => {
    const id = parseAgencyId(item);
    return id === "all" ? [] : [id];
  });
  const categories = searchValues(category).filter((item) =>
    (TOR_CATEGORIES as readonly string[]).includes(item),
  );
  const sources = searchValues(source).flatMap((item) => {
    const id = parseListingSource(item);
    return id === "egp-rss" || id === "sme-gp" || id === "bma-egp2" ? [id] : [];
  });
  const stages = parseListingStages(searchValues(stage));
  const budgetYears = searchValues(year).filter((item) => /^25\d{2}$/.test(item));
  const integrities = searchValues(integrity).flatMap((item) =>
    item === "ok" || item === "suspicious" ? [item] : [],
  );

  return (
    <ListingsView
      initialQuery={firstValue(q) ?? ""}
      initialAgencies={agencies satisfies AgencyId[]}
      initialCategories={categories}
      initialSources={sources satisfies SourceFilter[]}
      initialSort={parseListingSort(firstValue(sort))}
      initialStages={stages}
      initialBudgetYears={budgetYears}
      initialIntegrities={integrities satisfies IntegrityStatus[]}
    />
  );
}
