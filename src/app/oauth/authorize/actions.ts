"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CODE_TTL_MS, randomId, sha256 } from "@/lib/oauth";
import { createAdminClient } from "@/lib/supabase/admin";
import { backTo, checkAuthorizeRequest } from "./request";

/** Dozvoli: jednokratni kod za prijavljenu osobu → povratak u Claude. Odbij: povratak s access_denied. */
export async function decide(formData: FormData) {
  const user = await getCurrentUser();
  const sp = Object.fromEntries([...formData.entries()].filter((e): e is [string, string] => typeof e[1] === "string"));
  const req = await checkAuthorizeRequest({ ...sp, response_type: "code", code_challenge_method: "S256" });
  if ("error" in req) redirect("/");
  const { params } = req;

  if (sp.decision !== "allow") redirect(backTo(params.redirect_uri, { error: "access_denied", state: params.state }));

  const code = randomId(32);
  const { error } = await createAdminClient()
    .from("oauth_codes")
    .insert({
      code_hash: sha256(code),
      client_id: params.client_id,
      profile_id: user.id,
      redirect_uri: params.redirect_uri,
      code_challenge: params.code_challenge,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });
  if (error) redirect(backTo(params.redirect_uri, { error: "server_error", state: params.state }));

  redirect(backTo(params.redirect_uri, { code, state: params.state }));
}
