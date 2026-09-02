import type { Metadata } from "next";

import { LocaleProvider } from "@/components/providers/locale-provider";
import { NotificationPrefsProvider } from "@/components/providers/notification-prefs-provider";
import { SavedProvider } from "@/components/providers/saved-provider";
import { QueryProvider } from "@/components/providers/query-provider";

import "./globals.css";

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
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Mitr:wght@200;300;400;500;600;700&family=Pridi:wght@200;300;400;500;600;700&family=Prompt:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <QueryProvider>
          <LocaleProvider>
            <SavedProvider>
              <NotificationPrefsProvider>{children}</NotificationPrefsProvider>
            </SavedProvider>
          </LocaleProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
