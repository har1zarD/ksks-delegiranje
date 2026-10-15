import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConfirmHost } from "@/components/confirm";
import { THEME_SCRIPT } from "@/components/theme-switch";
import "./globals.css";

// Geist (Vercel) za tekst, Geist Mono za kodove i tokene
const geist = Geist({ variable: "--font-geist", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "KSKS Delegiranje",
  description: "Košarkaški savez Kantona Sarajevo — delegiranje sudija i komesara",
  // iPhone: s početnog ekrana se otvara bez Safarijeve trake, s kratkim imenom ispod ikone
  appleWebApp: { capable: true, title: "KSKS", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0e12" },
  ],
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
