import { z } from "zod";
import { ADMIN_MATCH_SELECT, ASSIGNMENT_WITH_TIME_SELECT, MATCH_SELECT } from "@/lib/data/selects";
import { assignPerson, eligibleFor, removeAssignment, sendMatchNominations } from "@/lib/delegation";
import {
  addDays,
  addMonths,
  POSITION_LABEL,
  POSITION_ORDER,
  requiredPositions,
  sarajevoToISO,
  type Position,
} from "@/lib/format";
import type { McpContext } from "../context";
import { dateSchema, defineTool, must, timeSchema, ToolError, uuidSchema } from "../define";
import { matchView } from "../view";

const ADMIN = ["admin"] as const;
const positionSchema = z.enum(POSITION_ORDER as [Position, ...Position[]]);


/** Početak dana `from` i početak dana poslije `to`, po sarajevskom vremenu */
function dayRange(from: string, to = from) {
  return { start: sarajevoToISO(from, "00:00"), end: sarajevoToISO(addDays(to, 1), "00:00") };
}


export const listCompetitions = defineTool({
  name: "list_competitions",
  description: "Takmičenja tekuće sezone s ekipama (id ekipe treba za create_match) i spisak dvorana.",
  roles: [...ADMIN],
  input: {},
  readOnly: true,
  async run(_args, { db }) {
    const [competitions, halls] = await Promise.all([
      db
        .from("competitions")
        .select("id, name, short_name, season:seasons!competitions_season_id_fkey!inner ( is_current ), teams ( id, name )")
        .eq("season.is_current", true)
        .order("sort"),
      db.from("halls").select("id, name").order("name"),
    ]);
    return {
      takmicenja: must(competitions).map((c) => ({
        id: c.id,
        naziv: c.name,
        kratko: c.short_name,
        ekipe: c.teams.sort((a, b) => a.name.localeCompare(b.name, "bs")).map((t) => ({ id: t.id, naziv: t.name })),
      })),
      dvorane: must(halls).map((h) => ({ id: h.id, naziv: h.name })),
    };
  },
});

export const listMatches = defineTool({
  name: "list_matches",
  description:
    "Utakmice u periodu (podrazumijevano narednih 14 dana), s pozicijama koje nedostaju. Datumi po sarajevskom vremenu.",
  roles: [...ADMIN],
  input: {
    od: dateSchema.optional().describe("Od datuma (uključivo); podrazumijevano danas"),
    do: dateSchema.optional().describe("Do datuma (uključivo); podrazumijevano od + 13 dana"),
    takmicenje_id: uuidSchema.optional(),
    samo_nepotpune: z.boolean().optional().describe("Samo utakmice kojima nedostaje neko delegiranje"),
  },
  readOnly: true,
  async run({ od, do: to, takmicenje_id, samo_nepotpune }, { db }) {
    const from = od ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sarajevo" }).format(new Date());
    const { start, end } = dayRange(from, to ?? addDays(from, 13));
    let q = db.from("matches").select(ADMIN_MATCH_SELECT).gte("starts_at", start).lt("starts_at", end);
    if (takmicenje_id) q = q.eq("competition_id", takmicenje_id);
    const rows = must(await q.order("starts_at").limit(300));

    return rows
      .map(({ assignments, ...m }) => {
        const active = assignments.filter((a) => a.status === "pending" || a.status === "accepted");
        const missing = requiredPositions(m.referee_count, m.table_count).filter((p) => !active.some((a) => a.position === p));
        return {
          ...matchView(m),
          nedostaje: missing.map((p) => POSITION_LABEL[p]),
          ceka_odgovor: active.filter((a) => a.status === "pending").length,
        };
      })
      .filter((m) => !samo_nepotpune || m.nedostaje.length > 0);
  },
});

const matchInput = {
  takmicenje_id: uuidSchema,
  domacin_id: uuidSchema.describe("id ekipe iz list_competitions"),
  gost_id: uuidSchema.describe("id ekipe iz list_competitions"),
  datum: dateSchema.describe("YYYY-MM-DD, sarajevsko vrijeme"),
  vrijeme: timeSchema.describe("HH:MM, sarajevsko vrijeme"),
  kolo: z.number().int().min(1).optional(),
  dvorana_id: uuidSchema.optional().describe("Izostavi da se uzme dvorana kluba domaćina (ako je poznata)"),
  broj_sudija: z.union([z.literal(2), z.literal(3)]).optional().describe("Izostavi za pravilo takmičenja"),
  broj_stola: z.union([z.literal(2), z.literal(3)]).optional().describe("Ljudi za zapisničkim stolom: 2 (bez 24 sekunde) ili 3; izostavi za pravilo takmičenja"),
  napomena: z.string().max(500).optional(),
};

async function checkTeams(db: McpContext["db"], competitionId: string, home: string, away: string) {
  if (home === away) throw new ToolError("Domaćin i gost moraju biti različite ekipe.");
  const teams = must(
    await db.from("teams").select("id, club:clubs!teams_club_id_fkey ( hall_id )").eq("competition_id", competitionId).in("id", [home, away]),
  );
  if (teams.length !== 2) throw new ToolError("Obje ekipe moraju biti iz izabranog takmičenja.");
  return teams.find((t) => t.id === home)?.club?.hall_id ?? null;
}

export const createMatch = defineTool({
  name: "create_match",
  description: "Kreiraj utakmicu. Vrijeme se upisuje po sarajevskom vremenu.",
  roles: [...ADMIN],
  input: matchInput,
  async run(a, { db }) {
    const homeHall = await checkTeams(db, a.takmicenje_id, a.domacin_id, a.gost_id);
    const rules = must(
      await db.from("competitions").select("referee_count_default, table_count_default").eq("id", a.takmicenje_id).single(),
    );
    const row = must(
      await db
        .from("matches")
        .insert({
          competition_id: a.takmicenje_id,
          home_team_id: a.domacin_id,
          away_team_id: a.gost_id,
          starts_at: sarajevoToISO(a.datum, a.vrijeme),
          round: a.kolo ?? null,
          hall_id: a.dvorana_id ?? homeHall,
          referee_count: a.broj_sudija ?? rules.referee_count_default,
          table_count: a.broj_stola ?? rules.table_count_default,
          notes: a.napomena ?? null,
        })
        .select(MATCH_SELECT)
        .single(),
      "Utakmica nije kreirana.",
    );
    return matchView(row);
  },
});

export const updateMatch = defineTool({
  name: "update_match",
  description: "Izmijeni utakmicu (samo navedena polja). Za promjenu termina navedi i datum i vrijeme.",
  roles: [...ADMIN],
  input: {
    utakmica_id: uuidSchema,
    takmicenje_id: matchInput.takmicenje_id.optional(),
    domacin_id: matchInput.domacin_id.optional(),
    gost_id: matchInput.gost_id.optional(),
    datum: matchInput.datum.optional(),
    vrijeme: matchInput.vrijeme.optional(),
    kolo: matchInput.kolo,
    dvorana_id: matchInput.dvorana_id,
    broj_sudija: matchInput.broj_sudija,
    broj_stola: matchInput.broj_stola,
    napomena: matchInput.napomena,
    status: z.enum(["scheduled", "live", "finished", "postponed", "cancelled"]).optional(),
  },
  async run(a, { db }) {
    const current = must(
      await db.from("matches").select("competition_id, home_team_id, away_team_id").eq("id", a.utakmica_id).maybeSingle(),
      "Utakmica nije pronađena.",
    );
    if ((a.datum && !a.vrijeme) || (!a.datum && a.vrijeme)) throw new ToolError("Za promjenu termina navedi datum i vrijeme.");

    const competitionId = a.takmicenje_id ?? current.competition_id;
    const home = a.domacin_id ?? current.home_team_id;
    const away = a.gost_id ?? current.away_team_id;
    if (a.takmicenje_id || a.domacin_id || a.gost_id) await checkTeams(db, competitionId, home, away);

    const patch = {
      competition_id: competitionId,
      home_team_id: home,
      away_team_id: away,
      ...(a.datum && a.vrijeme ? { starts_at: sarajevoToISO(a.datum, a.vrijeme) } : {}),
      ...(a.kolo !== undefined ? { round: a.kolo } : {}),
      ...(a.dvorana_id !== undefined ? { hall_id: a.dvorana_id } : {}),
      ...(a.broj_sudija !== undefined ? { referee_count: a.broj_sudija } : {}),
      ...(a.broj_stola !== undefined ? { table_count: a.broj_stola } : {}),
      ...(a.napomena !== undefined ? { notes: a.napomena } : {}),
      ...(a.status !== undefined ? { status: a.status } : {}),
    };
    const row = must(
      await db.from("matches").update(patch).eq("id", a.utakmica_id).select(MATCH_SELECT).single(),
      "Utakmica nije izmijenjena.",
    );
    return matchView(row);
  },
});

export const listPeople = defineTool({
  name: "list_people",
  description: "Sudije, zapisnički sto, komesari i admini (id osobe treba za assign).",
  roles: [...ADMIN],
  input: {
    uloga: z.enum(["sudija", "sto", "komesar", "admin"]).optional(),
    samo_aktivni: z.boolean().optional().describe("Podrazumijevano true"),
  },
  readOnly: true,
  async run({ uloga, samo_aktivni = true }, { db }) {
    let q = db.from("profiles").select("id, full_name, email, phone, role, is_referee, is_table, license, active");
    if (samo_aktivni) q = q.eq("active", true);
    if (uloga === "sudija") q = q.eq("role", "official").eq("is_referee", true);
    if (uloga === "sto") q = q.eq("role", "official").eq("is_table", true);
    if (uloga === "komesar") q = q.eq("role", "commissioner");
    if (uloga === "admin") q = q.eq("role", "admin");
    return must(await q.order("full_name")).map((p) => ({
      id: p.id,
      ime: p.full_name,
      email: p.email,
      telefon: p.phone,
      uloga: p.role,
      sudija: p.is_referee,
      sto: p.is_table,
      licenca: p.license,
      aktivan: p.active,
    }));
  },
});

export const whoIsFree = defineTool({
  name: "who_is_free",
  description:
    "Ko je slobodan na dan: za svaku osobu (opcionalno samo one koje mogu na poziciju) najavljeno odsustvo, druge utakmice istog dana i broj utakmica u mjesecu. Slobodni prvi, najmanje opterećeni prvi.",
  roles: [...ADMIN],
  input: {
    datum: dateSchema,
    pozicija: positionSchema.optional(),
    utakmica_id: uuidSchema.optional().describe("Isključi delegiranja na ovoj utakmici iz konflikata"),
  },
  readOnly: true,
  async run({ datum, pozicija, utakmica_id }, { db }) {
    const day = dayRange(datum);
    const month = {
      start: sarajevoToISO(`${datum.slice(0, 7)}-01`, "00:00"),
      end: sarajevoToISO(addMonths(`${datum.slice(0, 7)}-01`, 1), "00:00"),
    };
    let sameDayQ = db
      .from("assignments")
      .select(ASSIGNMENT_WITH_TIME_SELECT)
      .in("status", ["pending", "accepted"])
      .gte("match.starts_at", day.start)
      .lt("match.starts_at", day.end);
    if (utakmica_id) sameDayQ = sameDayQ.neq("match_id", utakmica_id);

    const [people, absences, sameDay, monthly] = await Promise.all([
      db.from("profiles").select("id, full_name, role, is_referee, is_table").eq("active", true).neq("role", "admin").order("full_name"),
      db.from("unavailability").select("profile_id, reason").lte("from_date", datum).gte("to_date", datum),
      sameDayQ,
      db
        .from("assignments")
        .select(ASSIGNMENT_WITH_TIME_SELECT)
        .in("status", ["pending", "accepted"])
        .gte("match.starts_at", month.start)
        .lt("match.starts_at", month.end),
    ]);

    const list = must(people)
      .filter((p) => !pozicija || eligibleFor(pozicija, p))
      .map((p) => {
        const absence = must(absences).find((a) => a.profile_id === p.id);
        const busy = must(sameDay).filter((a) => a.profile_id === p.id);
        return {
          id: p.id,
          ime: p.full_name,
          slobodan: !absence && busy.length === 0,
          odsustvo: absence ? (absence.reason ?? "da") : null,
          utakmice_istog_dana: busy.map((a) => matchTime(a.match.starts_at)),
          utakmica_u_mjesecu: must(monthly).filter((a) => a.profile_id === p.id).length,
        };
      });
    return list.sort(
      (a, b) => Number(b.slobodan) - Number(a.slobodan) || a.utakmica_u_mjesecu - b.utakmica_u_mjesecu || a.ime.localeCompare(b.ime, "bs"),
    );
  },
});


function matchTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sarajevo", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export const assign = defineTool({
  name: "assign",
  description:
    "Delegiraj osobu na poziciju na utakmici (status: čeka odgovor, email se šalje tek sa send_nominations). Odbijena nominacija na toj poziciji se zamjenjuje.",
  roles: [...ADMIN],
  input: { utakmica_id: uuidSchema, osoba_id: uuidSchema, pozicija: positionSchema },
  async run({ utakmica_id, osoba_id, pozicija }, { db, profile }) {
    const { id, name } = await assignPerson(db, { matchId: utakmica_id, profileId: osoba_id, position: pozicija, createdBy: profile.id });
    return { nominacija_id: id, osoba: name, pozicija: POSITION_LABEL[pozicija], status: "Nije poslano" };
  },
});

export const unassign = defineTool({
  name: "unassign",
  description:
    "Ukloni delegiranje s pozicije. Ako je nominacija već poslana, otkazuje se i osoba dobija email o otkazivanju.",
  roles: [...ADMIN],
  input: { utakmica_id: uuidSchema, pozicija: positionSchema },
  async run({ utakmica_id, pozicija }, { db }) {
    const rows = must(
      await db
        .from("assignments")
        .select("id")
        .eq("match_id", utakmica_id)
        .eq("position", pozicija)
        .in("status", ["pending", "accepted"]),
    );
    if (!rows[0]) throw new ToolError("Na toj poziciji nema aktivnog delegiranja.");
    const r = await removeAssignment(db, rows[0].id);
    return r.cancelled ? { otkazano: r.name, email: r.emailed } : { uklonjeno: r.name, email: false };
  },
});

export const sendNominations = defineTool({
  name: "send_nominations",
  description: "Pošalji email svima na utakmici kojima nominacija još nije poslana.",
  roles: [...ADMIN],
  input: { utakmica_id: uuidSchema },
  async run({ utakmica_id }, { db }) {
    const results = await sendMatchNominations(db, utakmica_id);
    if (results.length === 0) return { poruka: "Nema neposlanih nominacija." };
    return results.map((r) => ({ osoba: r.name, pozicija: POSITION_LABEL[r.position], poslano: r.sent }));
  },
});

export const analytics = defineTool({
  name: "analytics",
  description:
    "Statistika po osobi u periodu: broj prihvaćenih, odbijenih, otkazanih i neodgovorenih nominacija, te prihvaćenih po poziciji.",
  roles: [...ADMIN],
  input: { od: dateSchema, do: dateSchema },
  readOnly: true,
  async run({ od, do: to }, { db }) {
    if (to < od) throw new ToolError("Kraj perioda je prije početka.");
    const { start, end } = dayRange(od, to);
    const rows = must(
      await db
        .from("assignments")
        .select("position, status, profile:profiles!assignments_profile_id_fkey ( id, full_name ), match:matches!assignments_match_id_fkey!inner ( starts_at )")
        .gte("match.starts_at", start)
        .lt("match.starts_at", end),
    );

    const people = new Map<
      string,
      { ime: string; prihvaceno: number; odbijeno: number; otkazano: number; ceka: number; po_poziciji: Record<string, number> }
    >();
    for (const a of rows) {
      if (!a.profile) continue;
      const p = people.get(a.profile.id) ?? {
        ime: a.profile.full_name,
        prihvaceno: 0,
        odbijeno: 0,
        otkazano: 0,
        ceka: 0,
        po_poziciji: {},
      };
      if (a.status === "accepted") {
        p.prihvaceno++;
        p.po_poziciji[POSITION_LABEL[a.position]] = (p.po_poziciji[POSITION_LABEL[a.position]] ?? 0) + 1;
      }
      if (a.status === "declined") p.odbijeno++;
      if (a.status === "cancelled") p.otkazano++;
      if (a.status === "pending") p.ceka++;
      people.set(a.profile.id, p);
    }
    return {
      period: { od, do: to },
      osobe: [...people.values()].sort((a, b) => b.prihvaceno - a.prihvaceno || a.ime.localeCompare(b.ime, "bs")),
    };
  },
});

export const adminTools = [
  listCompetitions,
  listMatches,
  createMatch,
  updateMatch,
  listPeople,
  whoIsFree,
  assign,
  unassign,
  sendNominations,
  analytics,
];
