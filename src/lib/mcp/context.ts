import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Role } from "@/lib/auth";

export type McpProfile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_referee: boolean;
  is_table: boolean;
};

/**
 * Kontekst jednog MCP zahtjeva. `db` je servisni klijent (zaobilazi RLS),
 * pa svaki alat sam provjerava ulogu i vlasništvo.
 */
export type McpContext = {
  profile: McpProfile;
  tokenId: string;
  db: SupabaseClient<Database>;
};
