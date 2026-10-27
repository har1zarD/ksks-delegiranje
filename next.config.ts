import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Fontovi i grbovi koje PDF-ovi i OG slika čitaju s diska (bez ovoga Next uvuče cijeli projekat, i output/, u svaku funkciju)
  outputFileTracingIncludes: {
    "/**": ["src/app/_og/*.woff", "public/brand/ksks-logo-1024.png", "public/competitions/ksbih.png", "public/competitions/pdf/ksbih.png"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "fxdzcncfoutxunfwcyhi.supabase.co", port: "", pathname: "/storage/v1/object/public/club-logos/**", search: "" },
      // FIBA LiveStats: grbovi ekipa
      { protocol: "https", hostname: "images.statsengine.playbyplay.api.geniussports.com", port: "", pathname: "/**", search: "" },
    ],
  },
  experimental: {
    // Klijent čuva posjećenu stranicu 60 s: povratak na nju se ne učitava ponovo.
    // Svaka izmjena (Server Action s updateTag) i router.refresh odmah brišu ovaj keš.
    staleTimes: { dynamic: 60 },
    agentUpgrade: "security",
  },
  // Slike za objavu su prije bile pod Utakmicama
  async redirects() {
    return [{ source: "/admin/utakmice/objave", destination: "/admin/objave", permanent: true }];
  },
  // OAuth za MCP connector: standardne /.well-known adrese (i varijante s putanjom resursa, npr. /api/mcp)
  async rewrites() {
    return [
      { source: "/.well-known/oauth-protected-resource/:path*", destination: "/api/well-known/oauth-protected-resource" },
      { source: "/.well-known/oauth-authorization-server/:path*", destination: "/api/well-known/oauth-authorization-server" },
      { source: "/.well-known/openid-configuration/:path*", destination: "/api/well-known/oauth-authorization-server" },
    ];
  },
};

export default nextConfig;
