// Pravila delegiranja na jednom mjestu. Koriste ih web akcije i MCP alati.
// Funkcije primaju servisni klijent (zaobilazi RLS), pa pozivalac MORA prije provjeriti ulogu;
// ovdje se provjerava vlasništvo i stanje (ko smije odgovoriti, ko unosi rezultat).
// Keš se ovdje NE invalidira (web akcija koristi updateTag, MCP revalidateTag): pozivalac poziva invalidate
// s tabelom "assignments" i utakmicom (povratne vrijednosti nose matchId).
import type { SupabaseClient } from "@supabase/supabase-js";
import { MATCH_SELECT } from "@/lib/data/selects";
import { sendEmail } from "@/lib/email";
import { cancellationEmail, declinedEmail } from "@/lib/emails";
import { CREW_COLUMNS, crewOf, crewPositions, skillFor } from "@/lib/crew";
import type { MatchStatus, Position } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

/** Greška s porukom za korisnika */
export class DelegationError extends Error {}

/** Pomoćne sudije: zapisnik, pom. zapisnik, glavno vrijeme, 24/14, statistika */
const TABLE: Position[] = ["scorer", "assistant_scorer", "timer", "shot_clock", "statistician_1", "statistician_2", "statistician_3"];

export function eligibleFor(position: Position, p: { role: string; is_referee: boolean; is_table: boolean; table_skills: string[] }) {
  if (position === "commissioner") return p.role === "commissioner";
  // Pomoćne sudije: samo za pozicije koje osoba zna (zapisnik, glavno vrijeme, 24/14, statistika)
  if (TABLE.includes(position)) return p.role === "official" && p.is_table && p.table_skills.includes(skillFor(position)!);
  return p.role === "official" && p.is_referee;
}

export async function assignPerson(
  db: Db,
  { matchId, profileId, position, createdBy }: { matchId: string; profileId: string; position: Position; createdBy: string },
) {
  const [{ data: match }, { data: person }] = await Promise.all([
    db.from("matches").select(CREW_COLUMNS).eq("id", matchId).maybeSingle(),
    db.from("profiles").select("full_name, role, is_referee, is_table, table_skills, active").eq("id", profileId).maybeSingle(),
  ]);
  if (!match) throw new DelegationError("Utakmica nije pronađena.");
  if (!person?.active) throw new DelegationError("Osoba nije pronađena ili nije aktivna.");
  if (!crewPositions(crewOf(match)).includes(position)) throw new DelegationError("Ova utakmica nema tu poziciju.");
  if (!eligibleFor(position, person)) throw new DelegationError("Osoba nije registrovana za ovu poziciju.");

  // Odbijene/otkazane nominacije na istoj poziciji ili iste osobe oslobađaju mjesto
  const { error: cleanupError } = await db
    .from("assignments")
    .delete()
    .eq("match_id", matchId)
    .in("status", ["declined", "cancelled"])
    .or(`position.eq.${position},profile_id.eq.${profileId}`);
  if (cleanupError) throw new Error(cleanupError.message);

  const { data, error } = await db
    .from("assignments")
    .insert({ match_id: matchId, profile_id: profileId, position, created_by: createdBy })
    .select("id")
    .single();
  if (error?.code === "23505") throw new DelegationError("Osoba je već delegirana na ovu utakmicu ili je pozicija zauzeta.");
  if (error) throw new Error(error.message);
  return { id: data.id, name: person.full_name };
}

const WITH_PERSON_AND_MATCH =
  `id, match_id, position, status, notified_at, profile:profiles!assignments_profile_id_fkey ( id, full_name, email ), match:matches!assignments_match_id_fkey ( ${MATCH_SELECT} )` as const;

/**
 * Uklanja delegiranje. Neposlana ili odbijena nominacija se briše;
 * poslana (čeka/prihvaćena) se otkazuje i osoba dobija email.
 */
export async function removeAssignment(db: Db, assignmentId: string) {
  const { data: a } = await db.from("assignments").select(WITH_PERSON_AND_MATCH).eq("id", assignmentId).maybeSingle();
  if (!a) throw new DelegationError("Delegiranje nije pronađeno.");

  if (!a.notified_at || a.status === "declined" || a.status === "cancelled") {
    await db.from("assignments").delete().eq("id", a.id);
    return { matchId: a.match_id, name: a.profile?.full_name ?? null, cancelled: false, emailed: false };
  }

  await db.from("assignments").update({ status: "cancelled" }).eq("id", a.id);
  const emailed =
    a.profile && a.match
      ? await sendEmail({
          to: a.profile.email,
          kind: "cancellation",
          profileId: a.profile.id,
          assignmentId: a.id,
          ...cancellationEmail(a.profile.full_name, a.position, a.match),
        })
      : false;
  return { matchId: a.match_id, name: a.profile?.full_name ?? null, cancelled: true, emailed };
}

/** Šalje email svima na utakmici kojima nominacija još nije poslana */
/**
 * Odgovor na vlastitu, poslanu nominaciju. Odbijanje (i otkazivanje prihvaćene) javlja adminima.
 * Vraća funkciju za slanje obavijesti, da je web može pokrenuti nakon odgovora (after()).
 */
export async function respondToNomination(
  db: Db,
  { assignmentId, profileId, accept, reason }: { assignmentId: string; profileId: string; accept: boolean; reason?: string },
) {
  const why = reason?.trim();
  if (!accept && !why) throw new DelegationError("Za odbijanje je potreban razlog.");

  const { data, error } = await db
    .from("assignments")
    .update({
      status: accept ? "accepted" : "declined",
      decline_reason: accept ? null : why,
      responded_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("profile_id", profileId)
    .not("notified_at", "is", null)
    .in("status", ["pending", "accepted"])
    .select("id, status, position, match_id, profile:profiles!assignments_profile_id_fkey ( full_name )");
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) throw new DelegationError("Nominacija nije pronađena ili se na nju više ne može odgovoriti.");

  const notifyAdmins = async () => {
    if (accept) return;
    const [{ data: match }, { data: admins }] = await Promise.all([
      db.from("matches").select(MATCH_SELECT).eq("id", row.match_id).single(),
      db.from("profiles").select("id, email").eq("role", "admin").eq("active", true),
    ]);
    if (!match) return;
    const email = declinedEmail(row.profile?.full_name ?? "", row.position, why!, match);
    for (const admin of admins ?? []) {
      await sendEmail({ to: admin.email, kind: "declined", profileId: admin.id, assignmentId: row.id, ...email });
    }
  };

  return { status: row.status, matchId: row.match_id, notifyAdmins };
}

/** Dozvoljeni prelazi statusa za komesara (admin smije sve). Isto pravilo je u set_match_status(). */
export function commissionerCanSetStatus(from: MatchStatus, to: MatchStatus) {
  return (from === "scheduled" && to === "live") || (from === "live" && to === "finished");
}

/** Za MCP (servisni klijent): je li osoba prihvaćeni komesar utakmice i je li utakmica uživo */
export async function assertCommissionerCanScore(db: Db, matchId: string, profileId: string) {
  const [{ data: own }, { data: match }] = await Promise.all([
    db
      .from("assignments")
      .select("id")
      .eq("match_id", matchId)
      .eq("profile_id", profileId)
      .eq("position", "commissioner")
      .eq("status", "accepted"),
    db.from("matches").select("status").eq("id", matchId).maybeSingle(),
  ]);
  if (!own?.length) throw new DelegationError("Rezultat unosi samo komesar utakmice.");
  if (!match) throw new DelegationError("Utakmica nije pronađena.");
  return match.status;
}
