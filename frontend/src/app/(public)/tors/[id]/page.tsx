import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TorDetail } from "@/components/tor/tor-detail";
import { fetchTorById, fetchTors } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const tors = await fetchTors();
  return tors.map((tor) => ({ id: tor.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tor = await fetchTorById(id);
  return { title: tor?.title ?? "TOR" };
}

export default async function TorDetailPage({ params }: Props) {
  const { id } = await params;
  const [tor, tors] = await Promise.all([fetchTorById(id), fetchTors()]);
  if (!tor) notFound();
  return <TorDetail benchmarkTors={tors} tor={tor} />;
}
