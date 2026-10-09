import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticate } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";

// MCP preko Streamable HTTP, bez sesija (svaki zahtjev nosi Bearer token iz Postavki).
async function handle(request: Request) {
  const ctx = await authenticate(request);
  if (!ctx) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Neispravan ili opozvan token." }, id: null },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="ksks"' } },
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

export { handle as GET, handle as POST, handle as DELETE };
