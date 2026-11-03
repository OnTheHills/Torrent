import { ShellContent } from "@/components/layout/shell-content";
import { TorLoading } from "@/components/tor/tor-loading";

export default function Loading() {
  return (
    <ShellContent>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <TorLoading />
      </div>
    </ShellContent>
  );
}
