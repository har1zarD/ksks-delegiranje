import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Never Stop";
const read = name => JSON.parse(readFileSync(`${dir}${name}.json`, "utf8"));
const save = (name, value) => writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2) + "\n");
const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
if (!base || !key) throw new Error("Missing connection configuration.");
const api = async (path, init = {}) => {
  const res = await fetch(`${base}/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, ...init.headers } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res;
};
const mode = process.argv[2];

const club_id = "c5525224-841a-4c53-93b3-d05157259b2f";
const competition_id = "d74bc0b4-99f1-4313-8c15-463f76d06764";

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  const before = await (await api(`rest/v1/licenses?select=id&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (before.length) throw new Error("Existing licenses require reconciliation.");
  save("licenses-before", before);
  const team = await (await api(`rest/v1/teams?select=name,competition:competitions(name,season:seasons(name,is_current))&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (team.length !== 1 || team[0].name !== "Never Stop" || team[0].competition.name !== "A2 liga jug KSBiH" || !team[0].competition.season.is_current) throw new Error("Team or competition mismatch.");
  const folders = await (await api(`rest/v1/license_folders?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (folders.length !== 1) throw new Error("Folder missing.");
  // [prezime, ime, datum rođenja, mjesto, visina, pozicija, slika]
  const players = [
    ["Kahvedžić", "Teo", "2007-04-10", "Travnik", 197, 3, "IMG_8771"],
    ["Šutković", "Ismar", "2007-05-31", "Travnik", 176, 1, "IMG_8776"],
    ["Hodžić", "Harun", "2007-07-28", "Jajce", 200, 5, "IMG_8775"],
    ["Hamzakadić", "Davud", "2009-05-07", "Nova Bila", 188, 2, "IMG_8768"],
    ["Hodžić", "Armin", "2009-04-16", "Bugojno", 175, 1, "IMG_8769"],
    ["Kovać", "Muhamed", "2009-09-22", "Travnik", 187, 2, "IMG_8952"],
    ["Joldić", "Vedad", "2010-11-16", "Travnik", 198, 4, "IMG_8953"],
    ["Kovać", "Muhammed", "2009-05-23", "Travnik", 196, 2, "IMG_8774"],
    ["Melić", "Tarik", "2011-12-04", "Travnik", 180, 1, "IMG_8821"],
    ["Omeragić", "Sinan", "2011-01-21", "Travnik", 170, 1, "IMG_8822"],
    ["Sijamija", "Haris", "2007-09-27", "Travnik", 187, 1, "IMG_8773"],
    ["Škobić", "Bojan", "2008-01-22", "Travnik", 190, 2, "IMG_8835"],
    ["Podrug", "Faris", "2008-10-28", "Travnik", 205, 5, "IMG_8772"],
    ["Behlo", "Adem", "2012-09-29", "Travnik", 196, 4, "IMG_8770"],
    ["Idrizović", "Mirza", "2010-07-27", "Nova Bila", 190, 3, "IMG_8766"],
    ["Čavak", "Ahsen", "2007-04-06", "Sarajevo", 185, 1, "IMG_8834"],
    ["Šutković", "Rijad", "2010-07-27", "Travnik", 187, 3, "att.Cpvx5Zb80_DLlqcgdfPl-LuFejy-S0NMqicv27vAE7g"],
  ];
  const officials = [
    ["Hodžić", "Suad", "Trener", "IMG_8954"],
    ["Hodzić", "Ahmed", "Trener", "IMG_8957"],
    ["Vinčević", "Feriz", "Trener", "IMG_8986"],
    ["Rujanac", "Naser", "Trener", "IMG_8978"],
    ["Hodžić", "Ismail", "Službeno lice", "IMG_8975"],
    ["Šutković", "Nedim", "Službeno lice", null],
  ];
  const used = [...players.map(p => p[6]), ...officials.map(o => o[3])].filter(Boolean);
  const sources = readdirSync(sourceDir).map(f => f.replace(/\.jpe?g$/i, ""));
  if (new Set(used).size !== used.length || used.length !== sources.length || used.some(f => !sources.includes(f))) throw new Error("Photo mapping mismatch.");
  const photos = [];
  const photoFor = (first, last, file) => {
    if (!file) return null;
    const original = `${sourceDir}/${file}.jpeg`, source = `${dir}cropped/${file}.jpg`;
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${first} ${last}`);
    const photo = {
      index: photos.length + 1, person: `${first} ${last}`, original, source,
      original_sha256: hash(original), sha256: hash(source), size: bytes.length,
      content_type: "image/jpeg", path: `${club_id}/never-stop-2026-27-${randomUUID()}.jpg`,
    };
    photos.push(photo);
    return photo.path;
  };
  const positions = { 1: "PG", 2: "SG", 3: "SF", 4: "PF", 5: "C" };
  const records = [
    ...players.map(([last_name, first_name, birth_date, birth_place, height_cm, position, file], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place, height_cm,
      position: positions[position], license_no: null,
      photo_path: photoFor(first_name, last_name, file), sort: i + 1,
    })),
    ...officials.map(([last_name, first_name, role, file], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role,
      first_name, last_name, birth_date: null, birth_place: null,
      height_cm: null, position: null, license_no: null,
      photo_path: photoFor(first_name, last_name, file), sort: i + 1,
    })),
  ];
  if (records.length !== 23 || photos.length !== 22) throw new Error("Unexpected roster or photograph counts.");
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK Never Stop", team: "Never Stop", competition: "A2 liga jug KSBiH", season: "2026/27", club_id, competition_id,
    source: ["/Users/tarikvelic/Downloads/A2 LIGA IGRAČI 2026-2027.pdf", "Email „FW: Slike igraća“ 21.10.2026 (SK Never Stop via KSKS), 22 photos"],
    photos,
    missing_photos: records.filter(r => !r.photo_path).map(r => `${r.first_name} ${r.last_name}`),
    notes: [
      "Roster, birth dates, places, heights and positions from the signed club list (MJESTO → birth_place).",
      "Positions normalized: 1 → PG, 2 → SG, 3 → SF, 4 → PF, 5 → C.",
      "Photos identified by the name captions burned into each image; cropped to head and shoulders (4:5) to remove the captions.",
      "Armin Hodžić photo caption says 2010; list says 16.04.2009 — list used.",
      "Feriz Vinčević: list says TRENER, photo caption says Službeno lice — list used. Surname spelled Vinčević (caption); list scan reads Vinčevič.",
      "Ahmed Hodzić spelled as on both the list and the caption (no ž).",
      "Nedim Šutković (službeno lice) has no photo. Ljekar and fizioterapeut rows on the list are empty.",
      "A2 license folder already existed (created 2026-10-20).",
    ],
  });
  console.log(JSON.stringify({ players: players.length, officials: officials.length, photos: photos.length }));
} else if (mode === "--import") {
  const manifest = read("manifest"), records = read("licenses-insert");
  if (manifest.status !== "prepared") throw new Error("Not in prepared state.");
  for (const p of manifest.photos) {
    const res = await api(`storage/v1/object/licenses/${p.path}`, { method: "POST", headers: { "Content-Type": p.content_type }, body: readFileSync(p.source) });
    save(`upload-${p.index}`, await res.json());
  }
  const res = await api("rest/v1/licenses", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(records) });
  save("licenses-insert-result", await res.json());
  manifest.status = "imported";
  save("manifest", manifest);
  console.log(`Uploaded ${manifest.photos.length} photos, inserted ${records.length} licenses.`);
} else if (mode === "--verify") {
  const manifest = read("manifest"), expected = read("licenses-insert");
  const actual = await (await api(`rest/v1/licenses?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}&order=kind,sort`)).json();
  save("licenses-after", actual);
  if (actual.length !== expected.length) throw new Error("Record count mismatch.");
  for (const r of expected) {
    const stored = actual.find(a => a.id === r.id);
    if (!stored || Object.keys(r).some(k => stored[k] !== r[k])) throw new Error(`Record mismatch: ${r.first_name} ${r.last_name}`);
  }
  mkdirSync(`${dir}downloaded`, { recursive: true });
  for (const p of manifest.photos) {
    const bytes = Buffer.from(await (await api(`storage/v1/object/authenticated/licenses/${p.path}`)).arrayBuffer());
    writeFileSync(`${dir}downloaded/${p.index}.jpg`, bytes);
    if (createHash("sha256").update(bytes).digest("hex") !== p.sha256) throw new Error(`Stored photo differs: ${p.person}`);
  }
  const result = {
    verified_at: new Date().toISOString(), club: manifest.club, competition: manifest.competition, season: manifest.season,
    players: actual.filter(r => r.kind === "player").length, officials: actual.filter(r => r.kind === "official").length,
    photos_verified: manifest.photos.length, records_with_photos: actual.filter(r => r.photo_path).length,
    missing_photos: manifest.missing_photos, all_fields_match: true,
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --import or --verify.");
}
