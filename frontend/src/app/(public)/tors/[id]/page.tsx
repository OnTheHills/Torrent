import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TorDetail } from "@/components/tor/tor-detail";
import { fetchBudgetPeers, fetchTorById } from "@/lib/api";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tor = await fetchTorById(id);
  return { title: tor?.title ?? "TOR" };
}

export default async function TorDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { return: listingsReturn } = await searchParams;
  const tor = await fetchTorById(id);
  if (!tor) notFound();
  const peers = await fetchBudgetPeers(tor.category);
  return (
    <TorDetail
      benchmarkTors={peers}
      tor={tor}
      listingsReturn={listingsReturn}
    />
  );
}
