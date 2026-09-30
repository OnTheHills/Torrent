import type { Metadata } from "next";

import { MonitorHome } from "@/components/monitor/monitor-home";

export const metadata: Metadata = {
  title: "Monitor",
};

export default function MonitorPage() {
  return <MonitorHome />;
}
