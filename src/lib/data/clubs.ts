import { cacheLife, cacheTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { rows } from "./db";

// Klubovi s kontaktima (admin): mailing lista za raspored klubovima (adrese kluba i trenera, više adresa odvojenih zarezom).

async function clubRows() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.clubs, TAG.halls, TAG.teams, TAG.competitions);
  return rows(
    await createAdminClient()
      .from("clubs")
      .select("id, name, short_name, city, email, phone, logo_url, active, youth, hall:halls!clubs_hall_id_fkey ( name ), teams ( competition:competitions!teams_competition_id_fkey ( short_name, name, season:seasons!competitions_season_id_fkey ( is_current ) ) )")
      .order("name"),
  );
}

export async function getClubs() {
  await requireRole("admin");
  return (await clubRows()).map((c) => ({
    id: c.id,
    name: c.name,
    shortName: c.short_name,
    city: c.city,
    email: c.email,
    phone: c.phone,
    logoUrl: c.logo_url,
    active: c.active,
    /** Omladinska liga: prima raspored i izmjene utakmica */
    youth: c.youth,
    hall: c.hall?.name ?? null,
    /** Takmičenja tekuće sezone u kojima klub ima ekipu */
    competitions: [...new Set(c.teams.filter((t) => t.competition?.season?.is_current).map((t) => t.competition!.short_name ?? t.competition!.name))],
  }));
}
