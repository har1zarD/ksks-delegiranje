import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const directory = fileURLToPath(new URL("../output/international-teams-2026-10-19/", import.meta.url));
const read = (file) => JSON.parse(readFileSync(`${directory}${file}`, "utf8"));
const save = (file, value) => writeFileSync(`${directory}${file}`, `${JSON.stringify(value, null, 2)}\n`);
const manifest = read("manifest.json");
const flags = process.argv.slice(2);
if (flags.some((flag) => !["--prepare-snapshot", "--write"].includes(flag)) || flags.length > 1) {
  throw new Error("Upotreba: node --env-file=.env scripts/import-international-teams.mjs [--prepare-snapshot | --write]");
}
const write = flags.includes("--write");
const snapshot = flags.includes("--prepare-snapshot");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || (!snapshot && !process.env.SUPABASE_SECRET_KEY)) throw new Error("Nedostaje Supabase konfiguracija.");
const db = snapshot ? null : createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const competitionSelect = "*,season:seasons!inner(name,is_current),teams(id,name,club_id)";
const checked = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};
const competitions = snapshot ? read("competitions-before.json") : checked(await db.from("competitions").select(competitionSelect).eq("season.is_current", true).in("name", ["EuroCup", "ABA liga"]));
const clubs = snapshot ? read("clubs-before.json") : checked(await db.from("clubs").select("id,name,short_name,city,logo_url,active,youth,hall_id"));
for (const name of ["EuroCup", "ABA liga"]) {
  const matches = competitions.filter((c) => c.name === name && c.season.is_current && c.season.name === manifest.season && c.category === "seniori");
  if (matches.length !== 1) throw new Error(`Nije pronađeno jedinstveno takmičenje ${name}, ${manifest.season}.`);
}

const inserts = [];
const teams = [];
const uploads = [];
for (const item of manifest.teams) {
  const competition = competitions.find((c) => c.name === item.competition);
  let club = [...clubs, ...inserts].find((c) => c.name === item.clubName);
  if (!club) {
    if (!item.logoFile) throw new Error(`Nedostaje postojeći klub ${item.clubName}.`);
    const bytes = readFileSync(`${directory}${item.logoFile}`);
    if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`Neispravan PNG: ${item.logoFile}`);
    const path = `2026-10-19/international/${item.slug}.png`;
    club = { id: randomUUID(), name: item.clubName, short_name: item.shortName, city: item.city, logo_url: `${url}/storage/v1/object/public/club-logos/${path}`, active: true, youth: false };
    inserts.push(club);
    uploads.push({ path, file: item.logoFile, publicUrl: club.logo_url });
  }
  if (!club.active || !club.logo_url) throw new Error(`Klub nije aktivan ili nema logo: ${club.name}`);
  const existing = competition.teams.filter((t) => t.club_id === club.id || t.name === item.name);
  if (existing.length > 1 || (existing.length === 1 && existing[0].club_id !== club.id)) throw new Error(`Dvosmislena ekipa: ${item.name}`);
  teams.push({ id: existing[0]?.id ?? randomUUID(), competition_id: competition.id, club_id: club.id, name: item.name });
}
if (teams.length !== 18 || new Set(teams.map((t) => t.id)).size !== 18) throw new Error("Očekivano je 18 različitih ekipa.");

save("clubs-insert.json", inserts);
save("teams-upsert.json", teams);
save("plan.json", { season: manifest.season, newClubs: inserts.length, newTeams: teams.filter((t) => !competitions.some((c) => c.teams.some((old) => old.id === t.id))).length, teams: teams.length, uploads });
console.log(JSON.stringify({ newClubs: inserts.length, teams: teams.length, uploads: uploads.length, write }));
if (write) {
  for (const upload of uploads) {
    checked(await db.storage.from("club-logos").upload(upload.path, readFileSync(`${directory}${upload.file}`), { contentType: "image/png", cacheControl: "31536000", upsert: true }));
  }
  if (inserts.length) checked(await db.from("clubs").insert(inserts));
  checked(await db.from("teams").upsert(teams, { onConflict: "id" }));
  const after = checked(await db.from("competitions").select(competitionSelect).in("id", competitions.map((c) => c.id)));
  for (const team of teams) {
    const actual = after.find((c) => c.id === team.competition_id)?.teams.find((t) => t.id === team.id);
    if (!actual || actual.name !== team.name || actual.club_id !== team.club_id) throw new Error(`Upis nije potvrđen: ${team.name}`);
  }
  save("competitions-after.json", after);
  console.log("Potvrđeno svih 18 ekipa; postojeći ID-evi su sačuvani.");
}
