import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Role = Database["public"]["Enums"]["user_role"];

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isReferee: boolean;
  isTable: boolean;
};

// Data Access Layer: jedino mjesto koje čita sesiju. cache() = jedan upit po zahtjevu.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect("/prijava");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_referee, is_table, active")
    .eq("id", userId)
    .single();

  if (!profile || !profile.active) redirect("/prijava?greska=profil");

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    isReferee: profile.is_referee,
    isTable: profile.is_table,
  };
});

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export function homeFor(role: Role) {
  return role === "admin" ? "/admin" : "/nominacije";
}
