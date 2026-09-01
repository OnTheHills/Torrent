import type { Metadata } from "next";

import { ShowcaseView } from "@/components/showcase/showcase-view";

export const metadata: Metadata = {
  title: "Showcase",
};

export default function ShowcasePage() {
  return <ShowcaseView />;
}
