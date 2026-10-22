import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const save = (name, value) => writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2) + "\n");
const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
if (!base || !key) throw new Error("Missing connection configuration.");
const api = async (path, init = {}) => {
  const res = await fetch(`${base}/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, ...init.headers } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res;
};
const json = (path, method, body, prefer = "return=representation") => api(path, { method, headers: { "Content-Type": "application/json", Prefer: prefer }, body: JSON.stringify(body) }).then(r => r.json());

// Sarajevo (CET/CEST) → ISO, kao sarajevoToISO u src/lib/format.ts
const sarajevoToISO = (date, time) => {
  const [y, mo, d] = date.split("-").map(Number), [h, mi] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  const offset = t => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Sarajevo", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - t;
  };
  return new Date(asUtc - offset(asUtc - offset(asUtc))).toISOString();
};

const competition_id = "443667aa-44cf-4c3c-9934-5b3d426c8de4"; // A1 liga žene
// Nominacija KSBiH, I kolo (24./25. 10. 2026); postponed = ODGOĐENO, termin = prvobitni datum kola
const fixtures = [
  { number: 1, home: "StarTz", away: "G-Stars", status: "postponed", date: "2026-10-24", time: "12:00", hall: null },
  { number: 2, home: "Konjic", away: "RMU Banovići", status: "postponed", date: "2026-10-24", time: "12:00", hall: null },
  { number: 3, home: "Brčko Distrikt", away: "Play Off", status: "scheduled", date: "2026-10-24", time: "18:00", hall: { name: "TŠC Brčko", city: "Brčko" } },
  { number: 4, home: "Čelik", away: "Faze", status: "scheduled", date: "2026-10-25", time: "19:00", hall: { name: "SD Bilmišće", city: "Zenica" } },
  { number: 5, home: "Bugojno", away: "Zenica", status: "postponed", date: "2026-10-24", time: "12:00", hall: null },
];

const [competition] = await (await api(`rest/v1/competitions?select=*&id=eq.${competition_id}`)).json();
const teams = await (await api(`rest/v1/teams?select=id,name&competition_id=eq.${competition_id}`)).json();
const existing = await (await api(`rest/v1/matches?select=id,number,round,home_team_id,away_team_id&competition_id=eq.${competition_id}`)).json();
save("matches-before", existing);
const teamId = name => { const t = teams.filter(x => x.name === name); if (t.length !== 1) throw new Error(`Team not found: ${name}`); return t[0].id; };
for (const f of fixtures) {
  if (existing.some(m => m.number === f.number || (m.home_team_id === teamId(f.home) && m.away_team_id === teamId(f.away)))) throw new Error(`Match already exists: ${f.number} ${f.home} – ${f.away}`);
}

// Dvorane: postojeću po imenu, inače nova
const halls = {};
for (const h of fixtures.map(f => f.hall).filter(Boolean)) {
  const found = await (await api(`rest/v1/halls?select=*&name=eq.${encodeURIComponent(h.name)}`)).json();
  halls[h.name] = found[0] ?? (await json("rest/v1/halls", "POST", h))[0];
}
save("halls", halls);

// Sastav ekipe po pravilima takmičenja (crewDefaultsOf + crewToRow)
const crew = {
  has_referees: competition.referees_default, referee_count: competition.referee_count_default === 3 ? 3 : 2,
  has_commissioner: competition.commissioner_default, has_scorer: competition.scorer_default,
  has_assistant_scorer: competition.assistant_scorer_default, has_timer: competition.timer_default,
  has_assistant_timer: competition.assistant_timer_default, has_shot_clock: competition.shot_clock_default,
  has_timer_shot_clock: competition.timer_shot_clock_default, stats_count: Math.min(3, Math.max(0, competition.stats_default)),
  digital_scoresheet: competition.digital_default, table_count: competition.shot_clock_default ? 3 : 2,
};
const rows = fixtures.map(f => ({
  competition_id, round: 1, number: f.number, home_team_id: teamId(f.home), away_team_id: teamId(f.away),
  hall_id: f.hall ? halls[f.hall.name].id : null, starts_at: sarajevoToISO(f.date, f.time), status: f.status,
  notes: f.status === "postponed" ? "Odgođeno (nominacija KSBiH, I kolo) — novi termin naknadno." : null,
  ...crew,
}));
save("matches-insert", rows);
const inserted = await json("rest/v1/matches", "POST", rows);
save("matches-insert-result", inserted);

const after = await (await api(`rest/v1/matches?select=*,hall:halls(name,city)&competition_id=eq.${competition_id}&round=eq.1&order=number`)).json();
save("matches-after", after);
for (const r of rows) {
  const a = after.find(m => m.number === r.number);
  if (!a || Object.keys(r).some(k => (k === "starts_at" ? new Date(a[k]).getTime() !== new Date(r[k]).getTime() : a[k] !== r[k]))) throw new Error(`Match mismatch: ${r.number}`);
}
const result = {
  verified_at: new Date().toISOString(), competition: "A1 liga žene", round: 1,
  matches: after.map(m => `${m.number}. ${fixtures.find(f => f.number === m.number).home} – ${fixtures.find(f => f.number === m.number).away}: ${m.status === "postponed" ? "ODGOĐENO" : `${m.starts_at} · ${m.hall?.name}`}`),
  halls_created: Object.values(halls).filter(h => !h.address && !existing.length).map(h => `${h.name} (${h.city})`),
  published: false, officials_entered: false, all_fields_match: true,
};
save("verification", result);
console.log(JSON.stringify(result, null, 2));
