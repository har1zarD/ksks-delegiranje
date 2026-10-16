// Objava nominacije (aktiviranje utakmica): jedino mjesto koje čini delegiranje vidljivim službenim licima.
//  1. delegiranja koja čekaju dobijaju notified_at (tek tada ih sudija vidi i može odgovoriti)
//  2. utakmice dobijaju published_at
//  3. nominacija (dokument cijelog kola) ide emailom SVIM aktivnim sudijama, pomoćnim sudijama i komesarima
//     (skriveni primaoci); omladinska liga i seniori (pomoćne sudije) su odvojeni dokumenti.
//     Objava izmjena već aktivirane utakmice: nova imena su crvena; skinuti od zadnje objave (uklonjeni, zamijenjeni,
//     odbili) dobijaju mail, ali se u nominaciji ne ispisuju. Primaoci su po izboru svi sa liste ili samo učesnici tih
//     utakmica (ekipa + skinuti), da lista ne dobija email zbog jedne zamjene. Zamjena osobe ide istim putem (delegation.replaceAssignment).
// Koriste je web akcije i MCP; poziva se servisnim klijentom NAKON provjere admin uloge.
import { senderAddress, sendEmail, siteUrl } from "@/lib/email";
import { matchChangedEmail, nominationEmail, nominationKindOf, scheduleEmail, type MatchChange, type NominationKind, type NominationMatch } from "@/lib/nomination-email";
import type { MatchStatus, Position } from "@/lib/format";
import type { createAdminClient } from "@/lib/supabase/admin";

type Db = ReturnType<typeof createAdminClient>;

const PUBLISH_SELECT = `
  id, number, starts_at, round, kind, kind_label, digital_scoresheet, published_at, clubs_notified_at,
  competition:competitions!matches_competition_id_fkey ( name, sort, category ),
  home:teams!matches_home_team_id_fkey ( name ),
  away:teams!matches_away_team_id_fkey ( name ),
  hall:halls!matches_hall_id_fkey ( name ),
  assignments ( id, position, status, notified_at, profile:profiles!assignments_profile_id_fkey ( id, full_name, email, active ) )
` as const;

/** Kome ide nominacija emailom: svima sa liste (sudije, pomoćne sudije, komesari) ili samo učesnicima objavljenih utakmica (ekipa + skinuti od zadnje objave) */
export type PublishAudience = "all" | "crew";

export type PublishResult = {
  /** Objavljenih utakmica */
  matches: number;
  /** Delegiranja koja su sada postala vidljiva */
  revealed: number;
  /** Primalaca nominacije */
  recipients: number;
  audience: PublishAudience;
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
type Assignment = Row["assignments"][number];
const loadRows = async (db: Db, ids: string[]) => (await db.from("matches").select(PUBLISH_SELECT).in("id", ids).order("starts_at")).data;

const isActive = (a: Assignment) => (a.status === "pending" || a.status === "accepted") && Boolean(a.profile);

type Removed = { position: Position; name: string; profileId: string; email: string; active: boolean };

/** changed: koje delegiranje je novo u odnosu na prethodnu nominaciju (crveno). Skinuti se ne ispisuju, samo dobijaju mail. */
const toNomination = (m: Row, changed: (a: Assignment) => boolean = () => false): NominationMatch => ({
  ...m,
  crew: m.assignments
    .filter(isActive)
    .map((a) => ({ position: a.position, name: a.profile!.full_name, profileId: a.profile!.id, email: a.profile!.email, changed: changed(a) })),
});

const REMOVED_PROFILE = "( id, full_name, email, active )";

/**
 * Skinuti s poslane nominacije od zadnje objave utakmice: uklonjeni i zamijenjeni (assignment_removals) i oni koji su
 * odbili (assignment_declines). Red delegiranja se briše, pa su ovo jedini tragovi. Samo za već aktivirane utakmice;
 * ulaze među primaoce izmjene ("samo učesnicima"), ne u sadržaj.
 */
async function removedSinceLastPublish(db: Db, rows: Row[]) {
  const out = new Map<string, Removed[]>();
  const since = new Map(rows.filter((m) => m.published_at).map((m) => [m.id, new Date(m.published_at!).getTime()]));
  const ids = [...since.keys()];
  if (ids.length === 0) return out;
  const [removals, declines] = await Promise.all([
    db.from("assignment_removals").select(`match_id, position, at:removed_at, profile:profiles!assignment_removals_profile_id_fkey ${REMOVED_PROFILE}`).in("match_id", ids),
    db.from("assignment_declines").select(`match_id, position, at:declined_at, profile:profiles!assignment_declines_profile_id_fkey ${REMOVED_PROFILE}`).in("match_id", ids),
  ]);
  for (const r of [...(removals.data ?? []), ...(declines.data ?? [])]) {
    const p = r.profile;
    if (!p || new Date(r.at).getTime() <= since.get(r.match_id)!) continue;
    const list = out.get(r.match_id) ?? [];
    if (!list.some((x) => x.profileId === p.id && x.position === r.position)) list.push({ position: r.position, name: p.full_name, profileId: p.id, email: p.email, active: p.active });
    out.set(r.match_id, list);
  }
  return out;
}

export async function publishMatches(db: Db, matchIds: string[], audience: PublishAudience = "all"): Promise<PublishResult> {
  const ids = [...new Set(matchIds)];
  if (ids.length === 0) return { matches: 0, revealed: 0, recipients: 0, audience, documents: [], emailed: false, clubs: null };

  const { data: rows, error } = await db.from("matches").select(PUBLISH_SELECT).in("id", ids).order("starts_at");
  if (error) throw new Error(error.message);
  const removed = await removedSinceLastPublish(db, rows);

  // 1–2: vidljivost i oznaka objave
  const now = new Date().toISOString();
  const pending = rows.flatMap((m) => m.assignments.filter((a) => a.status === "pending" && !a.notified_at).map((a) => a.id));
  if (pending.length) {
    const { error: e } = await db.from("assignments").update({ notified_at: now }).in("id", pending);
    if (e) throw new Error(e.message);
  }
  const { error: e2 } = await db.from("matches").update({ published_at: now }).in("id", ids);
  if (e2) throw new Error(e2.message);

  // Već aktivirana utakmica: delegiranja koja se tek sada šalju su nova (zamjena ili naknadno delegiranje) → crveno
  const matches = rows.map((m) => toNomination(m, (a) => Boolean(m.published_at) && a.status === "pending" && !a.notified_at));

  // 3: JEDAN mail (omladinska liga i seniori kao dvije sekcije) svima sa liste, ili samo učesnicima ovih utakmica (ekipa + skinuti)
  const { data: list } =
    audience === "all" ? await db.from("profiles").select("email").eq("active", true).in("role", ["official", "commissioner"]) : { data: null };
  const crew = rows.flatMap((m) => [
    ...m.assignments.filter((a) => isActive(a) && a.profile!.active).map((a) => ({ email: a.profile!.email })),
    ...(removed.get(m.id) ?? []).filter((r) => r.active),
  ]);
  const recipients = [...new Set((list ?? crew).map((p) => p.email.toLowerCase()))];
  const link = siteUrl("/nominacije");
  const logo = siteUrl("/icons/icon-192.png");
  const sent = recipients.length && matches.length ? await sendEmail({ to: senderAddress(), bcc: recipients, kind: "nomination_list", ...nominationEmail(matches, link, logo) }) : false;
  const documents: PublishResult["documents"] = (["youth", "seniors"] as const)
    .map((kind) => ({ kind, matches: matches.filter((m) => nominationKindOf(m) === kind).length, sent }))
    .filter((d) => d.matches > 0);

  // 4: klubovima raspored omladinske lige (datum, vrijeme, dvorana, ekipe; bez službenih lica), ali SAMO pri prvom aktiviranju.
  //    "Objavi izmjene" nakon zamjene sudije ne ide klubovima; promjena termina, dvorane ili statusa ide posebnom obavijesti (notifyMatchChanged).
  const forClubs = rows.filter((m) => !m.clubs_notified_at && m.kind === "league" && CLUB_CATEGORIES.has(m.competition?.category ?? "")).map((m) => m.id);
  const clubs = forClubs.length ? await sendScheduleToClubs(db, forClubs) : null;

  return { matches: rows.length, revealed: pending.length, recipients: recipients.length, audience, documents, emailed: documents.length > 0 && documents.every((d) => d.sent), clubs };
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

  const recipients = await clubRecipients(db);
  const sent = recipients.length
    ? await sendEmail({ to: senderAddress(), bcc: recipients, kind: "schedule_clubs", ...scheduleEmail(rows.map((m) => toNomination(m)), siteUrl("/brand/ksks-logo-512.png")) })
    : false;
  if (sent) {
    const { error } = await db.from("matches").update({ clubs_notified_at: new Date().toISOString() }).in("id", ids);
    if (error) throw new Error(error.message);
  }
  return { matches: rows.length, recipients: recipients.length, sent };
}

/** Mailing lista klubova: SAMO klubovi omladinske lige (youth), aktivni, s emailom (više adresa po klubu razdvojenih zarezom) */
async function clubRecipients(db: Db) {
  const { data: clubs } = await db.from("clubs").select("email").eq("active", true).eq("youth", true).not("email", "is", null);
  return [
    ...new Set(
      (clubs ?? [])
        .flatMap((c) => (c.email ?? "").split(/[,;\s]+/))
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@")),
    ),
  ];
}

/**
 * Izmjena aktivirane utakmice (termin, dvorana, status otkazana/odgođena): mail svim delegiranim na utakmici (poslane nominacije)
 * i klubovima ako je omladinska liga. `before` = stanje prije izmjene. Vraća broj primalaca.
 */
export async function notifyMatchChanged(db: Db, matchId: string, before: { starts_at: string; hall_id: string | null; status: MatchStatus }) {
  const [rows, { data: cur }] = await Promise.all([loadRows(db, [matchId]), db.from("matches").select("starts_at, hall_id, status").eq("id", matchId).single()]);
  const m = rows?.[0];
  if (!m || !cur) return { recipients: 0, sent: false };

  const change: MatchChange = {};
  if (new Date(before.starts_at).getTime() !== new Date(cur.starts_at).getTime()) change.starts_at = { from: before.starts_at, to: cur.starts_at };
  if (before.hall_id !== cur.hall_id) {
    const old = before.hall_id ? (await db.from("halls").select("name").eq("id", before.hall_id).maybeSingle()).data?.name ?? null : null;
    change.hall = { from: old, to: m.hall?.name ?? null };
  }
  if (before.status !== cur.status) change.status = { from: before.status, to: cur.status };
  if (Object.keys(change).length === 0) return { recipients: 0, sent: false };

  const crew = m.assignments
    .filter((a) => (a.status === "pending" || a.status === "accepted") && a.notified_at && a.profile?.active)
    .map((a) => a.profile!.email.toLowerCase());
  const clubs = m.kind === "league" && CLUB_CATEGORIES.has(m.competition?.category ?? "") ? await clubRecipients(db) : [];
  const recipients = [...new Set([...crew, ...clubs])];
  const sent = recipients.length
    ? await sendEmail({ to: senderAddress(), bcc: recipients, kind: "match_changed", ...matchChangedEmail(toNomination(m), change, siteUrl("/brand/ksks-logo-512.png")) })
    : false;
  return { recipients: recipients.length, sent };
}
