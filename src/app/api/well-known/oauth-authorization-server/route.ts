import { authorizationServerMetadata, CORS, originOf } from "@/lib/oauth";

// /.well-known/oauth-authorization-server (rewrite u next.config): adrese prijave, tokena i registracije
export function GET(request: Request) {
  return Response.json(authorizationServerMetadata(originOf(request)), { headers: { ...CORS, "Cache-Control": "public, max-age=3600" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
