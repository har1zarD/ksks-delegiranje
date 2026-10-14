import { createAdminClient } from "@/lib/supabase/admin";
import { generateToken } from "@/lib/mcp/token";
import { CORS, oauthError, sha256, verifyPkce } from "@/lib/oauth";

// Razmjena koda za token (authorization_code + PKCE). Izdaje se lični MCP token osobe koja je dozvolila pristup.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const get = (k: string) => (typeof form?.get(k) === "string" ? (form!.get(k) as string) : "");

  if (get("grant_type") !== "authorization_code") return oauthError("unsupported_grant_type", "Podržan je samo authorization_code.");
  const code = get("code");
  const clientId = get("client_id");
  const redirectUri = get("redirect_uri");
  const verifier = get("code_verifier");
  if (!code || !clientId || !verifier) return oauthError("invalid_request", "Nedostaje code, client_id ili code_verifier.");

  const db = createAdminClient();
  // Jednokratno: označi kod kao iskorišten samo ako još nije (dva paralelna zahtjeva ne dobiju dva tokena)
  const { data: row } = await db
    .from("oauth_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code_hash", sha256(code))
    .is("used_at", null)
    .select("client_id, profile_id, redirect_uri, code_challenge, expires_at")
    .maybeSingle();

  if (!row || row.client_id !== clientId || new Date(row.expires_at).getTime() < Date.now()) {
    return oauthError("invalid_grant", "Kod je neispravan, istekao ili već iskorišten.");
  }
  if (redirectUri && redirectUri !== row.redirect_uri) return oauthError("invalid_grant", "redirect_uri se ne poklapa.");
  if (!verifyPkce(verifier, row.code_challenge)) return oauthError("invalid_grant", "PKCE provjera nije prošla.");

  const [{ data: client }, { data: profile }] = await Promise.all([
    db.from("oauth_clients").select("name").eq("id", clientId).maybeSingle(),
    db.from("profiles").select("active").eq("id", row.profile_id).maybeSingle(),
  ]);
  if (!profile?.active) return oauthError("invalid_grant", "Nalog nije aktivan.");

  const { token, hash, prefix } = generateToken();
  const { error } = await db.from("mcp_tokens").insert({
    profile_id: row.profile_id,
    name: client?.name ?? "MCP connector",
    token_hash: hash,
    prefix,
    oauth_client_id: clientId,
  });
  if (error) return oauthError("server_error", "Token nije izdan.", 500);

  return Response.json(
    { access_token: token, token_type: "Bearer", scope: "mcp" },
    { headers: { ...CORS, "Cache-Control": "no-store", Pragma: "no-cache" } },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
