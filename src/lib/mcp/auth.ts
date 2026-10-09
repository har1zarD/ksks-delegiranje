import { createAdminClient } from "@/lib/supabase/admin";
import type { McpContext } from "./context";
import { hashToken } from "./token";

/** Bearer token → aktivan profil. null = neispravan, opozvan ili neaktivan. */
export async function authenticate(request: Request): Promise<McpContext | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(ksks_[A-Za-z0-9_-]+)$/.exec(header.trim());
  if (!match) return null;

  const db = createAdminClient();
  const { data: token } = await db
    .from("mcp_tokens")
    .select("id, revoked_at, profile:profiles!mcp_tokens_profile_id_fkey ( id, email, full_name, role, is_referee, is_table, active )")
    .eq("token_hash", hashToken(match[1]))
    .maybeSingle();

  if (!token || token.revoked_at || !token.profile?.active) return null;

  await db.from("mcp_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", token.id);

  const p = token.profile;
  return {
    profile: { id: p.id, email: p.email, full_name: p.full_name, role: p.role, is_referee: p.is_referee, is_table: p.is_table },
    tokenId: token.id,
    db,
  };
}
