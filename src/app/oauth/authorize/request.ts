import { createAdminClient } from "@/lib/supabase/admin";

export type AuthorizeParams = {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  state: string;
};

/** Provjera zahtjeva za prijavu (isto na stranici i u akciji): klijent postoji, povratna adresa registrovana, PKCE S256 */
export async function checkAuthorizeRequest(sp: Record<string, string | string[] | undefined>) {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const params: AuthorizeParams = {
    client_id: one("client_id"),
    redirect_uri: one("redirect_uri"),
    code_challenge: one("code_challenge"),
    state: one("state").slice(0, 500),
  };

  if (!params.client_id) return { error: "Nedostaje client_id." } as const;
  const { data: client } = await createAdminClient()
    .from("oauth_clients")
    .select("id, name, redirect_uris")
    .eq("id", params.client_id)
    .maybeSingle();
  if (!client) return { error: "Aplikacija nije registrovana. Ukloni connector i dodaj ga ponovo." } as const;

  // Bez registrovane povratne adrese nikad ne preusmjeravamo (zaštita od otvorenog preusmjeravanja)
  const redirect = params.redirect_uri || (client.redirect_uris.length === 1 ? client.redirect_uris[0] : "");
  if (!client.redirect_uris.includes(redirect)) return { error: "Povratna adresa nije registrovana za ovu aplikaciju." } as const;
  params.redirect_uri = redirect;

  // Greške u nastavku se vraćaju klijentu (povratna adresa je provjerena)
  if (one("response_type") !== "code") return { client, params, redirectError: "unsupported_response_type" } as const;
  if (one("code_challenge_method") !== "S256" || !/^[A-Za-z0-9_-]{43,128}$/.test(params.code_challenge)) {
    return { client, params, redirectError: "invalid_request" } as const;
  }
  return { client, params } as const;
}

/** Povratak klijentu: ?code=… ili ?error=…, uvijek sa state */
export function backTo(redirectUri: string, values: Record<string, string>) {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(values)) if (v) url.searchParams.set(k, v);
  return url.toString();
}
