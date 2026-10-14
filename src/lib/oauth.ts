// OAuth 2.1 za MCP connector (MCP Authorization spec): metapodaci, dinamička registracija, PKCE (S256), jednokratni kodovi.
// Izdani token je lični MCP token (mcp_tokens): ista provjera kao ručno napravljen token, opoziv u Postavkama.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Javna adresa aplikacije iz zahtjeva (radi i na previewu, ne samo na produkciji) */
export function originOf(request: Request) {
  return new URL(request.url).origin;
}

export const MCP_PATH = "/api/mcp";
export const AUTHORIZE_PATH = "/oauth/authorize";
export const TOKEN_PATH = "/api/oauth/token";
export const REGISTER_PATH = "/api/oauth/register";

/** Kod vrijedi 10 minuta i može se iskoristiti jednom */
export const CODE_TTL_MS = 10 * 60_000;

export function protectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}${MCP_PATH}`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    resource_name: "KSKS Delegiranje",
  };
}

export function authorizationServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}${AUTHORIZE_PATH}`,
    token_endpoint: `${origin}${TOKEN_PATH}`,
    registration_endpoint: `${origin}${REGISTER_PATH}`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp"],
  };
}

/** Povratna adresa klijenta: https, ili http samo na lokalnom računaru (npr. Claude Code / Desktop) */
export function isAllowedRedirect(uri: string) {
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch {
    return false;
  }
}

export function randomId(bytes = 24) {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** PKCE S256: base64url(SHA-256(verifier)) === challenge, poređenje u konstantnom vremenu */
export function verifyPkce(verifier: string, challenge: string) {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  const computed = Buffer.from(createHash("sha256").update(verifier).digest("base64url"));
  const expected = Buffer.from(challenge);
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}

/** CORS za javne OAuth/metapodatke endpoint-e (klijenti iz browsera) */
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

/** OAuth greška u JSON obliku (RFC 6749) */
export function oauthError(error: string, description: string, status = 400) {
  return Response.json({ error, error_description: description }, { status, headers: { ...CORS, "Cache-Control": "no-store" } });
}
