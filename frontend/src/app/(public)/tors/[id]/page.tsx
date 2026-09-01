import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TorDetail } from "@/components/tor/tor-detail";
import { getTorById, MOCK_TORS } from "@/data/mock";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return MOCK_TORS.map((tor) => ({ id: tor.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tor = getTorById(id);
  return { title: tor?.title ?? "TOR" };
}

export default async function TorDetailPage({ params }: Props) {
  const { id } = await params;
  const tor = getTorById(id);
  if (!tor) notFound();
  return <TorDetail tor={tor} />;
}
