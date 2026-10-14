import { CORS, originOf, protectedResourceMetadata } from "@/lib/oauth";

// /.well-known/oauth-protected-resource (rewrite u next.config): gdje se MCP klijent prijavljuje
export function GET(request: Request) {
  return Response.json(protectedResourceMetadata(originOf(request)), { headers: { ...CORS, "Cache-Control": "public, max-age=3600" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
