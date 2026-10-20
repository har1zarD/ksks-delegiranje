import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("../output/a2-jug-2026-2027/", import.meta.url));
const read = (name) => JSON.parse(readFileSync(`${directory}${name}.json`, "utf8"));
const save = (name, data) => writeFileSync(`${directory}${name}.json`, `${JSON.stringify(data, null, 2)}\n`);
const competitions = read("competitions-before");
const clubs = read("clubs-before");
if (competitions.length !== 1) throw new Error("A2 liga nije jednoznačna.");
const competition = competitions[0];
if (competition.name !== "A2 liga jug KSBiH" || competition.category !== "seniori" || competition.gender !== "M" || competition.season.name !== "2026/27" || !competition.season.is_current) throw new Error("Pogrešno takmičenje ili sezona.");
const roster = [
  ["Vukovi", "KK Vukovi"],
  ["Never Stop", "KK Never Stop"],
  ["Lokomotiva", "KK Lokomotiva J&A"],
  ["Point", "KK Point"],
  ["Hrasnica", "KK Hrasnica"],
  ["Čelik", "KK Čelik"],
  ["Realway", "KK Realway"],
  ["Mladost", "KK Mladost"],
  ["Ilidža", "KK Ilidža"],
  ["Star Fojnica", "KK Star"],
];
const mode = process.argv[2];
if (!["--prepare", "--verify"].includes(mode) || process.argv.length !== 3) throw new Error("Upotreba: --prepare ili --verify");
if (mode === "--prepare") {
  if (read("matches-before").length || read("fees-before").length) throw new Error("Postoje utakmice ili uplate; potrebno je zasebno usklađivanje.");
  const teams = roster.map(([name, clubName], index) => {
    const matchingClubs = clubs.filter((club) => club.name === clubName);
    if (matchingClubs.length !== 1 || !matchingClubs[0].active || !matchingClubs[0].logo_url) throw new Error(`Klub/logo nije jednoznačan: ${clubName}`);
    const club = matchingClubs[0];
    const matchingTeams = competition.teams.filter((team) => team.club_id === club.id || team.name === name);
    if (matchingTeams.length > 1 || (matchingTeams.length && matchingTeams[0].club_id !== club.id)) throw new Error(`Dvosmislena ekipa: ${name}`);
    return { id: matchingTeams[0]?.id ?? randomUUID(), competition_id: competition.id, club_id: club.id, name, sort: index + 1 };
  });
  const removed = competition.teams.filter((team) => !teams.some((next) => next.id === team.id));
  const approvedRemoval = ["Orlovik Junior", "Spars No 1 Academy", "Gen-Star", "Radnički"];
  if (removed.length !== 4 || removed.some((team) => !approvedRemoval.includes(team.name))) throw new Error("Uklanjanje odstupa od odobrenog spiska.");
  save("teams-upsert", teams);
  save("teams-remove", removed);
  save("manifest", { competition: competition.name, season: competition.season.name, source: "/Users/tarikvelic/Downloads/A2 LIGA GRUPA JUG 2026-2027.pdf", sourcePage: 3, scope: "teams-and-logos-only", teams: roster.map(([name, clubName], index) => ({ name, clubName, sort: index + 1 })), removalApproved: true });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Nedostaje Supabase konfiguracija.");
  const config = (phase, requests) => writeFileSync(`/private/tmp/ksks-a2-${phase}.curl`, requests.map((request) => [
    `url = ${JSON.stringify(`${url}/rest/v1/${request.path}`)}`,
    `header = ${JSON.stringify(`apikey: ${key}`)}`,
    ...(request.method ? [`request = "${request.method}"`, 'header = "Content-Type: application/json"', `header = ${JSON.stringify(`Prefer: ${request.prefer ?? "return=representation"}`)}`] : []),
    ...(request.file ? [`data-binary = ${JSON.stringify(`@${directory}${request.file}.json`)}`] : []),
    `output = ${JSON.stringify(`${directory}${request.output}.json`)}`,
  ].join("\n")).join("\nnext\n"), { mode: 0o600 });
  config("upsert", [{ path: "teams?on_conflict=id", method: "POST", prefer: "resolution=merge-duplicates,return=representation", file: "teams-upsert", output: "teams-upsert-response" }]);
  config("remove", [{ path: `teams?competition_id=eq.${competition.id}&id=in.(${removed.map((team) => team.id).join(",")})`, method: "DELETE", output: "teams-remove-response" }]);
  config("after", [
    { path: `competitions?select=*,season:seasons!inner(name,is_current),teams(id,name,club_id,sort)&id=eq.${competition.id}`, output: "competitions-after" },
    { path: "clubs?select=id,name,short_name,city,logo_url,active,youth,hall_id&order=name", output: "clubs-after" },
    { path: `matches?select=*&competition_id=eq.${competition.id}`, output: "matches-after" },
  ]);
  console.log(JSON.stringify({ competition: competition.name, teams: teams.length, retainedIds: teams.filter((team) => competition.teams.some((old) => old.id === team.id)).length, added: teams.filter((team) => !competition.teams.some((old) => old.id === team.id)).map((team) => team.name), removed: removed.map((team) => team.name) }, null, 2));
} else {
  const actual = read("competitions-after")[0];
  const expected = read("teams-upsert");
  const afterClubs = read("clubs-after");
  if (actual.teams.length !== 10) throw new Error("Broj ekipa nije 10.");
  for (const team of expected) {
    const row = actual.teams.find((candidate) => candidate.id === team.id);
    if (!row || ["name", "club_id", "sort"].some((field) => row[field] !== team[field])) throw new Error(`Nije potvrđena ekipa: ${team.name}`);
    if (!afterClubs.find((club) => club.id === team.club_id)?.logo_url) throw new Error(`Nedostaje logo: ${team.name}`);
  }
  const settings = ({ teams, ...rest }) => rest;
  if (JSON.stringify(settings(competition)) !== JSON.stringify(settings(actual))) throw new Error("Postavke takmičenja su promijenjene.");
  const matchesBefore = read("matches-before");
  const matchesAfter = read("matches-after");
  for (const old of matchesBefore) {
    if (JSON.stringify(old) !== JSON.stringify(matchesAfter.find((match) => match.id === old.id))) throw new Error(`Utakmica je izmijenjena: ${old.id}`);
  }
  if (matchesAfter.some((match) => !expected.some((team) => team.id === match.home_team_id) || !expected.some((team) => team.id === match.away_team_id))) throw new Error("Utakmica koristi ekipu izvan novog sastava.");
  if (clubs.length !== afterClubs.length) throw new Error("Broj klubova je izmijenjen.");
  for (const old of clubs) {
    const next = afterClubs.find((club) => club.id === old.id);
    const fields = Object.keys(old).filter((field) => !(old.name === "KK Lokomotiva J&A" && field === "logo_url"));
    if (!next || fields.some((field) => old[field] !== next[field])) throw new Error(`Podaci kluba su izmijenjeni: ${old.name}`);
  }
  const logo = read("logo-source");
  if (afterClubs.find((club) => club.id === logo.clubId)?.logo_url !== logo.logoUrl) throw new Error("Logo Lokomotive nije ažuriran.");
  if (!readFileSync(`${directory}${logo.file}`).equals(readFileSync(`${directory}lokomotiva-public.jpg`))) throw new Error("Objavljeni logo se razlikuje od izvora.");
  for (const team of expected.filter((team) => team.club_id !== logo.clubId)) {
    const oldClub = clubs.find((club) => club.id === team.club_id);
    const actualClub = afterClubs.find((club) => club.id === team.club_id);
    if (oldClub.logo_url !== actualClub.logo_url || readFileSync(`${directory}logos/${team.sort}.png`).subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`Javni logo nije potvrđen: ${team.name}`);
  }
  const result = { competition: actual.name, season: actual.season.name, teams: actual.teams.sort((a, b) => a.sort - b.sort).map(({ name, sort }) => ({ sort, name })), teamCount: actual.teams.length, publicLogosVerified: 10, matchesWrittenByImport: 0, concurrentlyAddedMatchIds: matchesAfter.filter((match) => !matchesBefore.some((old) => old.id === match.id)).map((match) => match.id), competitionSettingsPreserved: true, clubsPreserved: true, testsRun: false, buildRun: false };
  save("verification", result);
  console.log(JSON.stringify(result, null, 2));
}
