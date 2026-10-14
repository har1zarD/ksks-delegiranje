// Objava nominacije (aktiviranje utakmica): jedino mjesto koje čini delegiranje vidljivim službenim licima.
//  1. delegiranja koja čekaju dobijaju notified_at (tek tada ih sudija vidi i može odgovoriti)
//  2. utakmice dobijaju published_at
//  3. nominacija kola ide emailom SVIM aktivnim sudijama, pomoćnim sudijama i komesarima (jedan email, skriveni primaoci)
//  4. svako delegirano lice dobija i lični pregled svojih utakmica iz ove objave
// Koriste je web akcije i MCP; poziva se servisnim klijentom NAKON provjere admin uloge.
import { senderAddress, sendEmail, siteUrl } from "@/lib/email";
import { nominationListEmail, personalNominationEmail, type NominationMatch } from "@/lib/nomination-email";
import type { Position } from "@/lib/format";
import type { createAdminClient } from "@/lib/supabase/admin";

type Db = ReturnType<typeof createAdminClient>;

const PUBLISH_SELECT = `
  id, number, starts_at, round, kind, kind_label, digital_scoresheet,
  competition:competitions!matches_competition_id_fkey ( name, sort ),
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
  /** Primalaca nominacije kola */
  recipients: number;
  /** Je li email zaista otišao (false = email nije podešen ili nije prošao) */
  emailed: boolean;
  /** Ličnih emailova poslano / pokušano */
  personal: { sent: number; total: number };
};

export async function publishMatches(db: Db, matchIds: string[]): Promise<PublishResult> {
  const ids = [...new Set(matchIds)];
  if (ids.length === 0) return { matches: 0, revealed: 0, recipients: 0, emailed: false, personal: { sent: 0, total: 0 } };

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

  const matches: NominationMatch[] = rows.map((m) => ({
    ...m,
    crew: m.assignments
      .filter((a) => (a.status === "pending" || a.status === "accepted") && a.profile)
      .map((a) => ({ position: a.position, name: a.profile!.full_name, profileId: a.profile!.id, email: a.profile!.email })),
  }));
  const link = siteUrl("/nominacije");

  // 3: nominacija kola svima sa liste (sudije, pomoćne sudije, komesari)
  const { data: list } = await db.from("profiles").select("email").eq("active", true).in("role", ["official", "commissioner"]);
  const recipients = [...new Set((list ?? []).map((p) => p.email.toLowerCase()))];
  const mail = nominationListEmail(matches, link);
  const emailed = recipients.length
    ? await sendEmail({ to: senderAddress(), bcc: recipients, kind: "nomination_list", ...mail })
    : false;

  // 4: lični pregled svakom delegiranom (samo ono što je ovom objavom postalo vidljivo)
  const revealedSet = new Set(pending);
  const perPerson = new Map<string, { name: string; email: string; items: { match: NominationMatch; position: Position }[] }>();
  for (const m of rows) {
    for (const a of m.assignments) {
      if (!revealedSet.has(a.id) || !a.profile?.active) continue;
      const p = perPerson.get(a.profile.id) ?? { name: a.profile.full_name, email: a.profile.email, items: [] };
      p.items.push({ match: matches.find((x) => x.id === m.id)!, position: a.position });
      perPerson.set(a.profile.id, p);
    }
  }
  let sent = 0;
  for (const [profileId, p] of perPerson) {
    const ok = await sendEmail({ to: p.email, kind: "nomination", profileId, ...personalNominationEmail(p.name, p.items, link) });
    if (ok) sent++;
  }

  return { matches: rows.length, revealed: pending.length, recipients: recipients.length, emailed, personal: { sent, total: perPerson.size } };
}
