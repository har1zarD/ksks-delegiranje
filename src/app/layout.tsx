import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConfirmHost } from "@/components/confirm";
import { THEME_SCRIPT } from "@/components/theme-switch";
import "./globals.css";

// Geist (Vercel) za tekst, Geist Mono za kodove i tokene
const geist = Geist({ variable: "--font-geist", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  // Apsolutne adrese za OG sliku i linkove u meta podacima
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.ksksarajevo.ba"),
  title: "KSKS Nominacije",
  description: "Košarkaški savez Kantona Sarajevo — nominacije sudija, pomoćnih sudija i komesara",
  openGraph: {
    type: "website",
    locale: "bs_BA",
    siteName: "KSKS Nominacije",
    title: "KSKS Nominacije",
    description: "Nominacije sudija, pomoćnih sudija i komesara. Rezultati, bilteni i naknade na jednom mjestu.",
  },
  twitter: { card: "summary_large_image" },
  // iPhone: s početnog ekrana se otvara bez Safarijeve trake, s kratkim imenom ispod ikone
  appleWebApp: { capable: true, title: "KSKS", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f5f6f8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: data-theme postavlja skripta prije Reacta
    <html lang="bs" className={`${geist.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <ConfirmHost />
      </body>
    </html>
  );
}
