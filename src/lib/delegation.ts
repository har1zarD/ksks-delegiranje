// Pravila delegiranja na jednom mjestu. Koriste ih web akcije i MCP alati.
// Funkcije primaju servisni klijent (zaobilazi RLS), pa pozivalac MORA prije provjeriti ulogu;
// ovdje se provjerava vlasništvo i stanje (ko smije odgovoriti, ko unosi rezultat).
// Keš se ovdje NE invalidira (web akcija koristi updateTag, MCP revalidateTag): pozivalac poziva invalidate
// s tabelom "assignments" i utakmicom (povratne vrijednosti nose matchId).
import type { SupabaseClient } from "@supabase/supabase-js";
import { MATCH_SELECT } from "@/lib/data/selects";
import { sendEmail } from "@/lib/email";
import { publishMatches } from "@/lib/publish";
import { cancellationEmail, declinedEmail, DELEGATION_INBOX } from "@/lib/emails";
import { CREW_COLUMNS, crewOf, crewPositions, skillsFor } from "@/lib/crew";
import { formatAbsence, matchWindow, type MatchStatus, type Position } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

/** Greška s porukom za korisnika */
export class DelegationError extends Error {}

/** Pomoćne sudije: zapisnik, pom. zapisnik, glavno vrijeme, 24/14, statistika */
const TABLE: Position[] = ["scorer", "assistant_scorer", "timer", "assistant_timer", "shot_clock", "timer_shot_clock", "statistician_1", "statistician_2", "statistician_3"];

export function eligibleFor(
  position: Position,
  p: { role: string; is_referee: boolean; is_table: boolean; is_commissioner: boolean; table_skills: string[] },
) {
  // Admin (savez) može biti i komesar ako je tako označen u Ljudima
  if (position === "commissioner") return p.role === "commissioner" || (p.role === "admin" && p.is_commissioner);
  // Admin (savez) može i suditi/raditi za stolom ako je tako označen u Ljudima
  const official = p.role === "official" || p.role === "admin";
  // Pomoćne sudije: samo za pozicije koje osoba zna (zapisnik, glavno vrijeme, 24/14, statistika)
  if (TABLE.includes(position)) return official && p.is_table && skillsFor(position).every((s) => p.table_skills.includes(s));
  return official && p.is_referee;
}

/** Smije li osoba na poziciju ove utakmice (baca DelegationError s razlogom) */
async function checkAssignable(db: Db, matchId: string, profileId: string, position: Position) {
  const [{ data: match }, { data: person }] = await Promise.all([
    db.from("matches").select(`starts_at, ${CREW_COLUMNS}`).eq("id", matchId).maybeSingle(),
    db.from("profiles").select("full_name, email, role, is_referee, is_table, is_commissioner, table_skills, active").eq("id", profileId).maybeSingle(),
  ]);
  if (!match) throw new DelegationError("Utakmica nije pronađena.");
  if (!person?.active) throw new DelegationError("Osoba nije pronađena ili nije aktivna.");
  if (!crewPositions(crewOf(match)).includes(position)) throw new DelegationError("Ova utakmica nema tu poziciju.");
  if (!eligibleFor(position, person)) throw new DelegationError("Osoba nije registrovana za ovu poziciju.");

  // Najavljeno odsustvo koje se preklapa s utakmicom
  const { start, end } = matchWindow(match.starts_at);
  const { data: away } = await db
    .from("unavailability")
    .select("starts_at, ends_at")
    .eq("profile_id", profileId)
    .lt("starts_at", end)
    .gt("ends_at", start)
    .limit(1);
  if (away?.length) {
    throw new DelegationError(`${person.full_name} je najavio odsustvo u vrijeme utakmice (${formatAbsence(away[0].starts_at, away[0].ends_at)}).`);
  }
  return person;
}

export async function assignPerson(
  db: Db,
  { matchId, profileId, position, createdBy }: { matchId: string; profileId: string; position: Position; createdBy: string },
) {
  const person = await checkAssignable(db, matchId, profileId, position);

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
 * Trajni trag ko je skinut s poslane nominacije (red delegiranja se briše kad se nađe zamjena):
 * objava izmjena šalje izmijenjenu nominaciju i njemu (publish.removedSinceLastPublish).
 */
async function logRemoval(db: Db, r: { matchId: string; profileId: string | undefined; position: Position; reason: "removed" | "replaced" }) {
  if (!r.profileId) return;
  const { error } = await db.from("assignment_removals").insert({ match_id: r.matchId, profile_id: r.profileId, position: r.position, reason: r.reason });
  if (error) console.error("assignment_removals:", error.message);
}

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
  await logRemoval(db, { matchId: a.match_id, profileId: a.profile?.id, position: a.position, reason: "removed" });
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

/**
 * Zamjena osobe na poziciji (npr. ne odgovara). Stara nominacija se briše.
 * Ako je stara već bila poslana, odmah se objavi izmjena utakmice: izmijenjena nominacija (nova osoba crveno)
 * ide ekipi utakmice i staroj osobi, a stara dobija i obavijest o otkazivanju. Neaktivirana se samo zamijeni.
 */
export async function replaceAssignment(
  db: Db,
  { assignmentId, profileId, createdBy }: { assignmentId: string; profileId: string; createdBy: string },
) {
  const { data: old } = await db.from("assignments").select(WITH_PERSON_AND_MATCH).eq("id", assignmentId).maybeSingle();
  if (!old || (old.status !== "pending" && old.status !== "accepted")) throw new DelegationError("Delegiranje nije pronađeno.");
  if (old.profile?.id === profileId) throw new DelegationError("Izaberi drugu osobu.");
  const person = await checkAssignable(db, old.match_id, profileId, old.position);

  const { error: delError } = await db.from("assignments").delete().eq("id", old.id);
  if (delError) throw new Error(delError.message);
  await assignPerson(db, { matchId: old.match_id, profileId, position: old.position, createdBy });

  if (!old.notified_at) return { matchId: old.match_id, name: person.full_name, emailed: false };
  await logRemoval(db, { matchId: old.match_id, profileId: old.profile?.id, position: old.position, reason: "replaced" });
  const { emailed } = await publishMatches(db, [old.match_id], "crew");
  // Zamijenjena osoba dobija i obavijest da je nominacija otkazana
  if (old.profile && old.match) {
    await sendEmail({
      to: old.profile.email,
      kind: "cancellation",
      profileId: old.profile.id,
      ...cancellationEmail(old.profile.full_name, old.position, old.match, "replaced"),
    });
  }
  return { matchId: old.match_id, name: person.full_name, emailed };
}

/**
 * Odgovor na vlastitu, poslanu nominaciju. Odbijanje (i otkazivanje prihvaćene) javlja svim adminima; prihvatanje se ne javlja emailom.
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
    // Prihvatanje samo iz pending
    .in("status", accept ? ["pending"] : ["pending", "accepted"])
    .select("id, status, position, match_id, profile:profiles!assignments_profile_id_fkey ( full_name )");
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) {
    if (accept) {
      const { data: done } = await db
        .from("assignments")
        .select("match_id")
        .eq("id", assignmentId)
        .eq("profile_id", profileId)
        .eq("status", "accepted")
        .maybeSingle();
      if (done) return { status: "accepted" as const, matchId: done.match_id, notifyAdmins: async () => {} };
    }
    throw new DelegationError("Nominacija nije pronađena ili se na nju više ne može odgovoriti.");
  }

  const notifyAdmins = async () => {
    // Prihvatanje se savezu ne javlja emailom (vidi se u aplikaciji)
    if (accept) return;
    const { data: match } = await db.from("matches").select(MATCH_SELECT).eq("id", row.match_id).single();
    if (!match) return;
    // Nalog delegiranja i Alden, plus ostali aktivni admini (jedan email, bez duplikata); kancelariju izbacuje sendEmail (NEVER_EMAIL)
    const { data: admins } = await db.from("profiles").select("email").eq("role", "admin").eq("active", true);
    const [to, ...bcc] = [...new Set([...DELEGATION_INBOX, ...(admins ?? []).map((a) => a.email)].map((e) => e.toLowerCase()))];
    const email = declinedEmail(row.profile?.full_name ?? "", row.position, why!, match);
    await sendEmail({ to, bcc, kind: "declined", assignmentId: row.id, ...email });
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
