import type { Metadata } from "next";

import { MonitorHome } from "@/components/home/monitor-home";

export const metadata: Metadata = {
  title: "Monitor",
};

export default function MonitorPage() {
  return <MonitorHome />;
}
