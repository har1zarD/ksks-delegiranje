import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // OAuth za MCP connector: standardne /.well-known adrese (i varijante s putanjom resursa, npr. /api/mcp)
  async rewrites() {
    return [
      { source: "/.well-known/oauth-protected-resource/:path*", destination: "/api/well-known/oauth-protected-resource" },
      { source: "/.well-known/oauth-authorization-server/:path*", destination: "/api/well-known/oauth-authorization-server" },
      { source: "/.well-known/openid-configuration/:path*", destination: "/api/well-known/oauth-authorization-server" },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
