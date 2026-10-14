// Objava nominacije (aktiviranje utakmica): jedino mjesto koje čini delegiranje vidljivim službenim licima.
//  1. delegiranja koja čekaju dobijaju notified_at (tek tada ih sudija vidi i može odgovoriti)
//  2. utakmice dobijaju published_at
//  3. nominacija (dokument cijelog kola) ide emailom SVIM aktivnim sudijama, pomoćnim sudijama i komesarima
//     (skriveni primaoci); omladinska liga i seniori (pomoćne sudije) su odvojeni dokumenti
// Koriste je web akcije i MCP; poziva se servisnim klijentom NAKON provjere admin uloge.
import { senderAddress, sendEmail, siteUrl } from "@/lib/email";
import { nominationEmail, nominationKindOf, type NominationKind, type NominationMatch } from "@/lib/nomination-email";
import type { createAdminClient } from "@/lib/supabase/admin";

type Db = ReturnType<typeof createAdminClient>;

const PUBLISH_SELECT = `
  id, number, starts_at, round, kind, kind_label, digital_scoresheet,
  competition:competitions!matches_competition_id_fkey ( name, sort, category ),
  home:teams!matches_home_team_id_fkey ( name ),
  away:teams!matches_away_team_id_fkey ( name ),
  hall:halls!matches_hall_id_fkey ( name ),
  assignments ( id, position, status, notified_at, profile:profiles!assignments_profile_id_fkey ( id, full_name, email, active ) )
` as const;

export type PublishResult = {
  /** Objavljenih utakmica */
  matches: number;
  /** Delegiranja koja su sada postala vidljiva */
  revealed: number;
  /** Primalaca nominacije */
  recipients: number;
  /** Poslani dokumenti: nominacija (omladinska) i/ili nominacija – pomoćne sudije (seniori) */
  documents: { kind: NominationKind; matches: number; sent: boolean }[];
  /** Svi dokumenti zaista otišli (false = email nije podešen, nije prošao ili test način) */
  emailed: boolean;
};

type Row = NonNullable<Awaited<ReturnType<typeof loadRows>>>[number];
const loadRows = async (db: Db, ids: string[]) => (await db.from("matches").select(PUBLISH_SELECT).in("id", ids).order("starts_at")).data;

const toNomination = (m: Row): NominationMatch => ({
  ...m,
  crew: m.assignments
    .filter((a) => (a.status === "pending" || a.status === "accepted") && a.profile)
    .map((a) => ({ position: a.position, name: a.profile!.full_name, profileId: a.profile!.id, email: a.profile!.email })),
});

/** Zamjena: nominacija te utakmice samo novoj osobi, njeno ime istaknuto crveno */
export async function sendReplacementNomination(
  db: Db,
  { matchId, assignmentId, profileId, email }: { matchId: string; assignmentId: string; profileId: string; email: string },
) {
  const rows = await loadRows(db, [matchId]);
  if (!rows?.length) return false;
  const match = toNomination(rows[0]);
  const doc = nominationEmail([match], nominationKindOf(match), siteUrl("/nominacije"), siteUrl("/icons/icon-192.png"), profileId);
  return sendEmail({ to: email, kind: "nomination", profileId, assignmentId, ...doc });
}

export async function publishMatches(db: Db, matchIds: string[]): Promise<PublishResult> {
  const ids = [...new Set(matchIds)];
  if (ids.length === 0) return { matches: 0, revealed: 0, recipients: 0, documents: [], emailed: false };

  const { data: rows, error } = await db.from("matches").select(PUBLISH_SELECT).in("id", ids).order("starts_at");
  if (error) throw new Error(error.message);

  // 1–2: vidljivost i oznaka objave
  const now = new Date().toISOString();
  const pending = rows.flatMap((m) => m.assignments.filter((a) => a.status === "pending" && !a.notified_at).map((a) => a.id));
  if (pending.length) {
    const { error: e } = await db.from("assignments").update({ notified_at: now }).in("id", pending);
    if (e) throw new Error(e.message);
  }
  const { error: e2 } = await db.from("matches").update({ published_at: now }).in("id", ids);
  if (e2) throw new Error(e2.message);

  const matches = rows.map(toNomination);

  // 3: nominacija svima sa liste; omladinska liga i seniori (pomoćne sudije) kao odvojeni dokumenti
  const { data: list } = await db.from("profiles").select("email").eq("active", true).in("role", ["official", "commissioner"]);
  const recipients = [...new Set((list ?? []).map((p) => p.email.toLowerCase()))];
  const link = siteUrl("/nominacije");
  const logo = siteUrl("/icons/icon-192.png");
  const documents: PublishResult["documents"] = [];
  for (const kind of ["youth", "seniors"] as const) {
    const part = matches.filter((m) => nominationKindOf(m) === kind);
    if (part.length === 0) continue;
    const sent = recipients.length
      ? await sendEmail({ to: senderAddress(), bcc: recipients, kind: "nomination_list", ...nominationEmail(part, kind, link, logo) })
      : false;
    documents.push({ kind, matches: part.length, sent });
  }

  return { matches: rows.length, revealed: pending.length, recipients: recipients.length, documents, emailed: documents.length > 0 && documents.every((d) => d.sent) };
}
