import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("../output/plbih-teams-2026-10-20/", import.meta.url));
const read = (name) => JSON.parse(readFileSync(`${directory}${name}.json`, "utf8"));
const save = (name, data) => writeFileSync(`${directory}${name}.json`, `${JSON.stringify(data, null, 2)}\n`);
const manifest = read("manifest");
const before = read("competitions-before");
const clubs = read("clubs-before");
const halls = read("halls-before");
const competitions = before.filter((c) => c.name === manifest.competition && c.gender === manifest.gender && c.category === "seniori" && c.season.is_current && c.season.name === manifest.season);
if (competitions.length !== 1) throw new Error("Muška PLBiH nije jednoznačno pronađena.");
const competition = competitions[0];
const mode = process.argv[2];
if (!["--prepare", "--verify"].includes(mode) || process.argv.length !== 3) throw new Error("Upotreba: --prepare ili --verify");

if (mode === "--prepare") {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Nedostaje Supabase konfiguracija.");
  const config = (phase, requests) => writeFileSync(`/private/tmp/ksks-plbih-${phase}.curl`, requests.map((r) => [
    `url = ${JSON.stringify(r.url)}`,
    ...(r.auth === false ? [] : [`header = ${JSON.stringify(`apikey: ${key}`)}`]),
    ...(r.method ? [`request = "${r.method}"`] : []),
    ...(r.headers ?? []).map((h) => `header = ${JSON.stringify(h)}`),
    ...(r.file ? [`data-binary = ${JSON.stringify(`@${directory}${r.file}`)}`] : []),
    `output = ${JSON.stringify(`${directory}${r.output}`)}`,
  ].join("\n")).join("\nnext\n"), { mode: 0o600 });
  const newClubs = [];
  const updates = [];
  const teams = [];
  const uploads = [];
  for (const [i, item] of manifest.teams.entries()) {
    const existing = clubs.filter((c) => c.name === item.clubName);
    if (existing.length > 1) throw new Error(`Dvosmislen klub: ${item.clubName}`);
    const bytes = readFileSync(`${directory}${item.logoFile}`);
    if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`Neispravan PNG: ${item.logoFile}`);
    const path = `2026-10-20/plbih/${item.slug}.png`;
    const logoUrl = `${url}/storage/v1/object/public/club-logos/${path}`;
    const club = existing[0] ?? { id: randomUUID(), name: item.clubName, short_name: item.shortName, city: item.city, active: true, youth: false, logo_url: logoUrl };
    if (!club.active) throw new Error(`Klub nije aktivan: ${club.name}`);
    if (!existing.length) newClubs.push(club);
    else updates.push({ id: club.id, logo_url: logoUrl });
    const oldTeams = competition.teams.filter((t) => t.club_id === club.id || t.name === item.name);
    if (oldTeams.length > 1 || (oldTeams.length && oldTeams[0].club_id !== club.id)) throw new Error(`Dvosmislena ekipa: ${item.name}`);
    teams.push({ id: oldTeams[0]?.id ?? randomUUID(), competition_id: competition.id, club_id: club.id, name: item.name, sort: i + 1 });
    uploads.push({ slug: item.slug, path, logoUrl, file: item.logoFile });
  }
  if (teams.length !== 14 || new Set(teams.map((t) => t.club_id)).size !== 14) throw new Error("Očekivano je 14 različitih klubova.");
  if (competition.teams.some((t) => !teams.some((next) => next.id === t.id))) throw new Error("Postojeća ekipa izvan zadanog spiska.");
  const matchingHalls = halls.filter((h) => /hrasnica/i.test(h.name));
  if (matchingHalls.length > 1) throw new Error("Dvorana Hrasnica nije jednoznačna.");
  const hall = matchingHalls[0] ?? { id: randomUUID(), name: "Sportska dvorana Hrasnica", city: "Ilidža" };
  save("clubs-insert", newClubs);
  save("club-logo-updates", updates);
  save("teams-upsert", teams);
  save("hall-upsert", [hall]);
  save("plan", { competitionId: competition.id, season: manifest.season, newClubs: newClubs.length, newTeams: teams.filter((t) => !competition.teams.some((old) => old.id === t.id)).length, totalTeams: teams.length, newHall: !matchingHalls.length, uploads });
  config("upload", uploads.map((u) => ({ url: `${url}/storage/v1/object/club-logos/${u.path}`, method: "POST", headers: ["Content-Type: image/png", "x-upsert: true", "Cache-Control: max-age=31536000"], file: u.file, output: `upload-${u.slug}.json` })));
  const jsonHeaders = ["Content-Type: application/json", "Prefer: return=representation"];
  const clubRequests = newClubs.length ? [{ url: `${url}/rest/v1/clubs`, method: "POST", headers: jsonHeaders, file: "clubs-insert.json", output: "clubs-insert-response.json" }] : [];
  for (const update of updates) {
    const name = `club-logo-${update.id}`;
    save(name, { logo_url: update.logo_url });
    clubRequests.push({ url: `${url}/rest/v1/clubs?id=eq.${update.id}`, method: "PATCH", headers: jsonHeaders, file: `${name}.json`, output: `${name}-response.json` });
  }
  config("clubs", clubRequests);
  config("teams", [{ url: `${url}/rest/v1/teams?on_conflict=id`, method: "POST", headers: ["Content-Type: application/json", "Prefer: resolution=merge-duplicates,return=representation"], file: "teams-upsert.json", output: "teams-response.json" }]);
  config("hall", [{ url: `${url}/rest/v1/halls?on_conflict=name`, method: "POST", headers: ["Content-Type: application/json", "Prefer: resolution=merge-duplicates,return=representation"], file: "hall-upsert.json", output: "hall-response.json" }]);
  mkdirSync(`${directory}public-logos`, { recursive: true });
  config("read-after", [
    { url: `${url}/rest/v1/competitions?select=*,season:seasons!inner(name,is_current),teams(id,name,club_id,sort)&season.is_current=eq.true&name=ilike.*Premijer*`, output: "competitions-after.json" },
    { url: `${url}/rest/v1/clubs?select=id,name,short_name,city,logo_url,active,youth,hall_id&order=name`, output: "clubs-after.json" },
    { url: `${url}/rest/v1/halls?select=*`, output: "halls-after.json" },
    ...uploads.map((u) => ({ url: u.logoUrl, auth: false, output: `public-logos/${u.slug}.png` })),
  ]);
  console.log(JSON.stringify(read("plan"), null, 2));
} else {
  const after = read("competitions-after");
  const actual = after.find((c) => c.id === competition.id);
  const clubRows = read("clubs-after");
  const expected = read("teams-upsert");
  if (actual.teams.length !== 14) throw new Error("Broj ekipa nije 14.");
  for (const team of expected) {
    const row = actual.teams.find((t) => t.id === team.id);
    if (!row || ["name", "club_id", "sort"].some((k) => row[k] !== team[k])) throw new Error(`Nije potvrđena ekipa: ${team.name}`);
    const club = clubRows.find((c) => c.id === row.club_id);
    const item = manifest.teams.find((t) => t.name === team.name);
    const upload = read("plan").uploads.find((u) => u.slug === item.slug);
    if (!club?.active || club.logo_url !== upload.logoUrl) throw new Error(`Nije potvrđen logo: ${team.name}`);
    if (!readFileSync(`${directory}${item.logoFile}`).equals(readFileSync(`${directory}public-logos/${item.slug}.png`))) throw new Error(`Javni logo se razlikuje: ${team.name}`);
  }
  const withoutTeams = ({ teams, ...settings }) => settings;
  if (JSON.stringify(withoutTeams(competition)) !== JSON.stringify(withoutTeams(actual))) throw new Error("Postavke takmičenja su izmijenjene.");
  for (const other of before.filter((c) => c.id !== competition.id)) {
    if (JSON.stringify(other) !== JSON.stringify(after.find((c) => c.id === other.id))) throw new Error("Drugo takmičenje je izmijenjeno.");
  }
  for (const old of clubs) {
    const next = clubRows.find((c) => c.id === old.id);
    if (!next || Object.keys(old).filter((k) => k !== "logo_url").some((k) => old[k] !== next[k])) throw new Error(`Ostali podaci kluba su izmijenjeni: ${old.name}`);
  }
  const newHalls = read("halls-after");
  if (newHalls.filter((h) => h.name === "Sportska dvorana Hrasnica").length !== 1) throw new Error("Dvorana nije potvrđena.");
  for (const old of halls) {
    if (JSON.stringify(old) !== JSON.stringify(newHalls.find((h) => h.id === old.id))) throw new Error("Postojeća dvorana je izmijenjena.");
  }
  const result = { competition: actual.name, season: actual.season.name, teams: actual.teams.length, publicLogosVerified: 14, existingTeamIdsPreserved: competition.teams.every((t) => actual.teams.some((a) => a.id === t.id)), hall: "Sportska dvorana Hrasnica", competitionSettingsUnchanged: true, existingClubDetailsUnchanged: true, existingHallsUnchanged: true, testsRun: false, buildRun: false };
  save("verification", result);
  console.log(JSON.stringify(result, null, 2));
}
