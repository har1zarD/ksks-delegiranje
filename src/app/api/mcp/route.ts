import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticate } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";
import { CORS, originOf } from "@/lib/oauth";

// MCP preko Streamable HTTP, bez sesija. Token: lični iz Postavki ili izdan preko OAuth prijave (custom connector).
async function handle(request: Request) {
  const ctx = await authenticate(request);
  if (!ctx) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Neispravan ili opozvan token." }, id: null },
      {
        status: 401,
        headers: {
          ...CORS,
          // Klijent odavde nalazi OAuth prijavu (MCP Authorization spec)
          "WWW-Authenticate": `Bearer realm="ksks", resource_metadata="${originOf(request)}/.well-known/oauth-protected-resource"`,
          "Access-Control-Expose-Headers": "WWW-Authenticate",
        },
      },
    );
  }

  const server = createMcpServer(ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export { handle as GET, handle as POST, handle as DELETE };
