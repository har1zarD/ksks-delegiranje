import { z } from "zod";
import { invalidateFromRoute } from "@/lib/cache";
import { CREW_COLUMNS, CREW_DEFAULT_COLUMNS, crewDefaultsOf, crewOf, crewPositions, crewToRow, type Crew } from "@/lib/crew";
import { ADMIN_MATCH_SELECT, ASSIGNMENT_WITH_TIME_SELECT, MATCH_SELECT } from "@/lib/data/selects";
import { assignPerson, eligibleFor, removeAssignment } from "@/lib/delegation";
import { publishMatches } from "@/lib/publish";
import {
  addDays,
  addMonths,
  formatAbsence,
  matchWindow,
  POSITION_LABEL,
  POSITION_ORDER,
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
        const missing = crewPositions(crewOf(m)).filter((p) => !active.some((a) => a.position === p));
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
  broj_utakmice: z.number().int().min(1).optional().describe("Broj utakmice u sezoni (\"Utakmica 66\"); izostavi za sljedeći slobodan"),
  dvorana_id: uuidSchema.optional().describe("Izostavi da se uzme dvorana kluba domaćina (ako je poznata)"),
  // Sastav ekipe: svako polje izostavi za pravilo takmičenja
  broj_sudija: z.union([z.literal(0), z.literal(2), z.literal(3)]).optional().describe("0 = bez sudija (npr. seniori: samo pomoćne sudije), 2 ili 3"),
  komesar: z.boolean().optional(),
  zapisnik: z.boolean().optional(),
  pom_zapisnik: z.boolean().optional().describe("Pomoćni zapisničar"),
  glavno_vrijeme: z.boolean().optional(),
  pom_semafor: z.boolean().optional().describe("Pomoćni semafor (ABA liga)"),
  sat_24: z.boolean().optional().describe("Operator 24/14"),
  glavno_vrijeme_24: z.boolean().optional().describe("Jedna osoba za glavno vrijeme i 24/14 (omladinska liga)"),
  statistika: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional().describe("Broj statističara (0–3)"),
  digitalni_zapisnik: z.boolean().optional(),
  napomena: z.string().max(500).optional(),
};

type CrewInput = Partial<Record<"komesar" | "zapisnik" | "pom_zapisnik" | "glavno_vrijeme" | "pom_semafor" | "sat_24" | "glavno_vrijeme_24" | "digitalni_zapisnik", boolean>> & {
  broj_sudija?: 0 | 2 | 3;
  statistika?: 0 | 1 | 2 | 3;
};

/** Sastav iz MCP argumenata preko osnovnog (pravilo takmičenja ili postojeća utakmica) */
function crewWith(base: Crew, a: CrewInput): Crew {
  return {
    referees: a.broj_sudija === undefined ? base.referees : a.broj_sudija > 0,
    refereeCount: a.broj_sudija === 2 || a.broj_sudija === 3 ? a.broj_sudija : base.refereeCount,
    commissioner: a.komesar ?? base.commissioner,
    scorer: a.zapisnik ?? base.scorer,
    assistantScorer: a.pom_zapisnik ?? base.assistantScorer,
    timer: a.glavno_vrijeme ?? base.timer,
    assistantTimer: a.pom_semafor ?? base.assistantTimer,
    shotClock: a.sat_24 ?? base.shotClock,
    timerShotClock: a.glavno_vrijeme_24 ?? base.timerShotClock,
    stats: a.statistika ?? base.stats,
    digital: a.digitalni_zapisnik ?? base.digital,
  };
}

const CREW_KEYS = ["broj_sudija", "komesar", "zapisnik", "pom_zapisnik", "glavno_vrijeme", "pom_semafor", "sat_24", "glavno_vrijeme_24", "statistika", "digitalni_zapisnik"] as const;

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
      await db.from("competitions").select(CREW_DEFAULT_COLUMNS).eq("id", a.takmicenje_id).single(),
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
          ...(a.broj_utakmice ? { number: a.broj_utakmice } : {}),
          hall_id: a.dvorana_id ?? homeHall,
          ...crewToRow(crewWith(crewDefaultsOf(rules), a)),
          notes: a.napomena ?? null,
        })
        .select(MATCH_SELECT)
        .single(),
      "Utakmica nije kreirana.",
    );
    // MCP radi u route handleru: updateTag nije dozvoljen, pa revalidateTag (invalidateFromRoute)
    invalidateFromRoute({ table: "matches", match: row.id });
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
    broj_utakmice: matchInput.broj_utakmice,
    dvorana_id: matchInput.dvorana_id,
    broj_sudija: matchInput.broj_sudija,
    komesar: matchInput.komesar,
    zapisnik: matchInput.zapisnik,
    pom_zapisnik: matchInput.pom_zapisnik,
    glavno_vrijeme: matchInput.glavno_vrijeme,
    pom_semafor: matchInput.pom_semafor,
    sat_24: matchInput.sat_24,
    glavno_vrijeme_24: matchInput.glavno_vrijeme_24,
    statistika: matchInput.statistika,
    digitalni_zapisnik: matchInput.digitalni_zapisnik,
    napomena: matchInput.napomena,
    status: z.enum(["scheduled", "live", "finished", "postponed", "cancelled"]).optional(),
  },
  async run(a, { db }) {
    const current = must(
      await db.from("matches").select(`competition_id, home_team_id, away_team_id, ${CREW_COLUMNS}`).eq("id", a.utakmica_id).maybeSingle(),
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
      ...(a.broj_utakmice !== undefined ? { number: a.broj_utakmice } : {}),
      ...(a.dvorana_id !== undefined ? { hall_id: a.dvorana_id } : {}),
      ...(CREW_KEYS.some((k) => a[k] !== undefined) ? crewToRow(crewWith(crewOf(current), a)) : {}),
      ...(a.napomena !== undefined ? { notes: a.napomena } : {}),
      ...(a.status !== undefined ? { status: a.status } : {}),
    };
    const row = must(
      await db.from("matches").update(patch).eq("id", a.utakmica_id).select(MATCH_SELECT).single(),
      "Utakmica nije izmijenjena.",
    );
    invalidateFromRoute({ table: "matches", match: a.utakmica_id });
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
    let q = db.from("profiles").select("id, full_name, email, phone, role, is_referee, is_table, is_commissioner, table_skills, license, active");
    if (samo_aktivni) q = q.eq("active", true);
    if (uloga === "sudija") q = q.eq("role", "official").eq("is_referee", true);
    if (uloga === "sto") q = q.eq("role", "official").eq("is_table", true);
    if (uloga === "komesar") q = q.or("role.eq.commissioner,and(role.eq.admin,is_commissioner.eq.true)");
    if (uloga === "admin") q = q.eq("role", "admin");
    return must(await q.order("full_name")).map((p) => ({
      id: p.id,
      ime: p.full_name,
      email: p.email,
      telefon: p.phone,
      uloga: p.role,
      sudija: p.is_referee,
      sto: p.is_table,
      sto_zna: p.is_table ? p.table_skills : [],
      komesar: p.role === "commissioner" || (p.role === "admin" && p.is_commissioner),
      licenca: p.license,
      aktivan: p.active,
    }));
  },
});

export const whoIsFree = defineTool({
  name: "who_is_free",
  description:
    "Ko je slobodan na dan: za svaku osobu (opcionalno samo one koje mogu na poziciju) najavljeno odsustvo, druge utakmice istog dana i broj utakmica u mjesecu. Slobodni prvi, najmanje opterećeni prvi. Sa utakmica_id odsustvo se gleda za vrijeme te utakmice (početak + 2 sata), inače za cijeli dan; odsutnu osobu assign odbija.",
  roles: [...ADMIN],
  input: {
    datum: dateSchema,
    pozicija: positionSchema.optional(),
    utakmica_id: uuidSchema.optional().describe("Isključi delegiranja na ovoj utakmici iz konflikata"),
  },
  readOnly: true,
  async run({ datum, pozicija, utakmica_id }, { db }) {
    const day = dayRange(datum);
    // Odsustvo: u vrijeme utakmice ako je zadana, inače bilo kad tog dana
    const match = utakmica_id ? must(await db.from("matches").select("starts_at").eq("id", utakmica_id).maybeSingle()) : null;
    const window = match ? matchWindow(match.starts_at) : day;
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
      db.from("profiles").select("id, full_name, role, is_referee, is_table, is_commissioner, table_skills").eq("active", true).or("role.neq.admin,is_referee.eq.true,is_table.eq.true,is_commissioner.eq.true").order("full_name"),
      db.from("unavailability").select("profile_id, reason, starts_at, ends_at").lt("starts_at", window.end).gt("ends_at", window.start),
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
          odsustvo: absence ? [formatAbsence(absence.starts_at, absence.ends_at), absence.reason].filter(Boolean).join(", ") : null,
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
    let assigned;
    try {
      assigned = await assignPerson(db, { matchId: utakmica_id, profileId: osoba_id, position: pozicija, createdBy: profile.id });
    } finally {
      // I neuspjeli pokušaj je mogao obrisati odbijene/otkazane nominacije
      invalidateFromRoute({ table: "assignments", match: utakmica_id });
    }
    const { id, name } = assigned;
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
    invalidateFromRoute({ table: "assignments", match: r.matchId });
    return r.cancelled ? { otkazano: r.name, email: r.emailed } : { uklonjeno: r.name, email: false };
  },
});

export const sendNominations = defineTool({
  name: "send_nominations",
  description:
    "Aktiviraj (objavi) utakmice: delegirani tek tada vide nominaciju; svim sudijama, pomoćnim sudijama i komesarima ide nominacija (dokument cijelog kola) emailom; omladinska liga i seniori odvojeno.",
  roles: [...ADMIN],
  input: { utakmice: z.array(uuidSchema).min(1).max(100).describe("id utakmica koje se objavljuju") },
  async run({ utakmice }, { db }) {
    let r;
    try {
      r = await publishMatches(db, utakmice);
    } finally {
      // Vidljivost se upisuje prije slanja emaila, pa i kad slanje pukne
      invalidateFromRoute(...utakmice.map((match) => ({ table: "assignments" as const, match })), ...utakmice.map((match) => ({ table: "matches" as const, match })));
    }
    return {
      objavljeno_utakmica: r.matches,
      vidljivih_delegiranja: r.revealed,
      dokumenti: r.documents.map((d) => ({ vrsta: d.kind === "youth" ? "nominacija" : "nominacija – pomoćne sudije", utakmica: d.matches, poslano: d.sent })),
      primalaca: r.recipients,
    };
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
