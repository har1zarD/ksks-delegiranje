import { createAdminClient } from "@/lib/supabase/admin";
import { CORS, isAllowedRedirect, oauthError, randomId } from "@/lib/oauth";
import { ipOf, rateLimit } from "@/lib/rate-limit";

// Dinamička registracija klijenta (RFC 7591): Claude se sam registruje prije prve prijave.
// Registracija ne daje pristup ničemu; pristup daje tek osoba koja se prijavi i klikne "Dozvoli".
export async function POST(request: Request) {
  if (!(await rateLimit(`oauth-register:ip:${ipOf(request.headers)}`, 10, 3600))) {
    return oauthError("too_many_requests", "Previše registracija. Pokušaj kasnije.", 429);
  }
  const body = (await request.json().catch(() => null)) as { client_name?: unknown; redirect_uris?: unknown } | null;
  const uris = Array.isArray(body?.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === "string") : [];
  if (uris.length === 0 || uris.length > 10 || !uris.every(isAllowedRedirect)) {
    return oauthError("invalid_redirect_uri", "redirect_uris moraju biti https adrese (http samo za localhost).");
  }
  const name = typeof body?.client_name === "string" && body.client_name.trim() ? body.client_name.trim().slice(0, 80) : "MCP klijent";

  const id = randomId(18);
  const { error } = await createAdminClient().from("oauth_clients").insert({ id, name, redirect_uris: uris });
  if (error) return oauthError("server_error", "Registracija nije uspjela.", 500);

  return Response.json(
    {
      client_id: id,
      client_name: name,
      redirect_uris: uris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      client_id_issued_at: Math.floor(Date.now() / 1000),
    },
    { status: 201, headers: { ...CORS, "Cache-Control": "no-store" } },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
