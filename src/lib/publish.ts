// Objava nominacije (aktiviranje utakmica): jedino mjesto koje čini delegiranje vidljivim službenim licima.
//  1. delegiranja koja čekaju dobijaju notified_at (tek tada ih sudija vidi i može odgovoriti)
//  2. utakmice dobijaju published_at
//  3. nominacija (dokument cijelog kola) ide emailom SVIM aktivnim sudijama, pomoćnim sudijama i komesarima
//     (skriveni primaoci); omladinska liga i seniori (pomoćne sudije) su odvojeni dokumenti
// Koriste je web akcije i MCP; poziva se servisnim klijentom NAKON provjere admin uloge.
import { senderAddress, sendEmail, siteUrl } from "@/lib/email";
import { nominationEmail, nominationKindOf, scheduleEmail, type NominationKind, type NominationMatch } from "@/lib/nomination-email";
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
  /** Raspored klubovima (omladinska liga, bez službenih lica); null = u objavi nije bilo takvih utakmica */
  clubs: ScheduleResult | null;
};

/** Klubovi dobijaju raspored samo omladinske lige; seniori i turniri ne idu klubovima */
const CLUB_CATEGORIES = new Set(["pioniri", "kadeti", "juniori", "minibasket", "unobasket"]);

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
  const doc = nominationEmail([match], siteUrl("/nominacije"), siteUrl("/icons/icon-192.png"), profileId);
  return sendEmail({ to: email, kind: "nomination", profileId, assignmentId, ...doc });
}

export async function publishMatches(db: Db, matchIds: string[]): Promise<PublishResult> {
  const ids = [...new Set(matchIds)];
  if (ids.length === 0) return { matches: 0, revealed: 0, recipients: 0, documents: [], emailed: false, clubs: null };

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

  // 3: nominacija svima sa liste, JEDAN mail: omladinska liga i seniori (pomoćne sudije) kao dvije sekcije
  const { data: list } = await db.from("profiles").select("email").eq("active", true).in("role", ["official", "commissioner"]);
  const recipients = [...new Set((list ?? []).map((p) => p.email.toLowerCase()))];
  const link = siteUrl("/nominacije");
  const logo = siteUrl("/icons/icon-192.png");
  const sent = recipients.length && matches.length ? await sendEmail({ to: senderAddress(), bcc: recipients, kind: "nomination_list", ...nominationEmail(matches, link, logo) }) : false;
  const documents: PublishResult["documents"] = (["youth", "seniors"] as const)
    .map((kind) => ({ kind, matches: matches.filter((m) => nominationKindOf(m) === kind).length, sent }))
    .filter((d) => d.matches > 0);

  // 4: klubovima raspored omladinske lige (datum, vrijeme, dvorana, ekipe; bez službenih lica)
  const forClubs = rows.filter((m) => m.kind === "league" && CLUB_CATEGORIES.has(m.competition?.category ?? "")).map((m) => m.id);
  const clubs = forClubs.length ? await sendScheduleToClubs(db, forClubs) : null;

  return { matches: rows.length, revealed: pending.length, recipients: recipients.length, documents, emailed: documents.length > 0 && documents.every((d) => d.sent), clubs };
}

export type ScheduleResult = { matches: number; recipients: number; sent: boolean };

/**
 * Raspored klubovima: izabrane utakmice (datum, vrijeme, dvorana, ekipe) svim klubovima na mailing listi (adrese klubova i trenera,
 * više adresa po klubu razdvojenih zarezom). BEZ sudija, komesara i pomoćnih sudija. Bilježi clubs_notified_at.
 */
export async function sendScheduleToClubs(db: Db, matchIds: string[]): Promise<ScheduleResult> {
  const ids = [...new Set(matchIds)];
  if (ids.length === 0) return { matches: 0, recipients: 0, sent: false };
  const rows = await loadRows(db, ids);
  if (!rows?.length) return { matches: 0, recipients: 0, sent: false };

  const { data: clubs } = await db.from("clubs").select("email").eq("active", true).not("email", "is", null);
  const recipients = [
    ...new Set(
      (clubs ?? [])
        .flatMap((c) => (c.email ?? "").split(/[,;\s]+/))
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@")),
    ),
  ];
  const sent = recipients.length
    ? await sendEmail({ to: senderAddress(), bcc: recipients, kind: "schedule_clubs", ...scheduleEmail(rows.map(toNomination), siteUrl("/brand/ksks-logo-512.png")) })
    : false;
  if (sent) {
    const { error } = await db.from("matches").update({ clubs_notified_at: new Date().toISOString() }).in("id", ids);
    if (error) throw new Error(error.message);
  }
  return { matches: rows.length, recipients: recipients.length, sent };
}
