import Script from "next/script";
import { IBM_Plex_Sans_Thai, Prompt } from "next/font/google";

import type { Metadata } from "next";

import { LocaleProvider } from "@/components/providers/locale-provider";
import { NotificationPrefsProvider } from "@/components/providers/notification-prefs-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { SavedProvider } from "@/components/providers/saved-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-prompt",
  display: "swap",
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TORRENT — Thai Government Software Procurement",
    template: "%s · TORRENT",
  },
  description:
    "Discover software-related procurement TORs from five Thai government agencies, benchmark budgets, and get matched as a vendor.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${prompt.variable} ${ibmPlexSansThai.variable}`}
    >
      <body>
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        {/* React Query powers live TOR lists; SessionProvider keeps OAuth state global. */}
        <QueryProvider>
          <LocaleProvider>
            <SessionProvider>
              <SavedProvider>
                <NotificationPrefsProvider>{children}</NotificationPrefsProvider>
              </SavedProvider>
            </SessionProvider>
          </LocaleProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
