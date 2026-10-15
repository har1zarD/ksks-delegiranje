import type { MetadataRoute } from "next";

// "Dodaj na početni ekran": aplikacija se otvara kao samostalna, s grbom kao ikonom
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KSKS Delegiranje",
    short_name: "KSKS",
    description: "Košarkaški savez Kantona Sarajevo — delegiranje sudija, zapisničkog stola i komesara",
    lang: "bs",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#f5f6f8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
