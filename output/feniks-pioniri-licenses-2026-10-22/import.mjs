import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Feniks Pioniri";
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

const club_id = "530834e7-b357-4e69-beea-aa64d53d0697";
const competition_id = "ad3e34d0-8393-46ec-a464-e0db6a898cb9";

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  const before = await (await api(`rest/v1/licenses?select=id&club_id=eq.${club_id}`)).json();
  if (before.length) throw new Error("Existing licenses require reconciliation.");
  save("licenses-before", before);
  const team = await (await api(`rest/v1/teams?select=name,competition:competitions(name,season:seasons(name,is_current))&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (team.length !== 1 || team[0].name !== "Feniks" || team[0].competition.name !== "Pioniri — Grupa 1" || !team[0].competition.season.is_current) throw new Error("Team or competition mismatch.");
  // [ime, prezime, datum rođenja, mjesto rođenja, slika]
  const players = [
    ["Alan", "Čubak", "2012-02-06", "Sarajevo", "cubak alan.jpg"],
    ["Ishak", "Pleh", "2013-03-17", "Sarajevo", "isak pleh.jpg"],
    ["Malik", "Muharemović", "2012-11-12", "Sarajevo", "malik muharemovic.jpg"],
    ["Ahmed", "Mališević", "2012-10-21", "Sarajevo", "malisevic ahmed.jpg"],
    ["Kerim", "Bahuna", "2012-02-22", "Sarajevo", "bahuna kerim.jpg"],
    ["Ishak", "Poplata", "2014-09-01", "Sarajevo", "poplata ishak.jpg"],
    ["Muhamed", "Mušović", "2014-02-15", "Sarajevo", "musoovic muhamed.jpg"],
    ["Dino", "Arnautović", "2013-06-26", "Sarajevo", "dino arnautovic.jpg"],
    ["Emir", "Bahuna", null, "Sarajevo", "bahuna emir.jpg"],
    ["Benjamin", "Pašić", "2015-05-30", "Sarajevo", "pašić benjamin.jpg"],
    ["Benjamin", "Kuršumlić", "2015-06-05", "Sarajevo", "kursumlic  benjamin.jpg"],
    ["Amar", "Hodžić", "2014-01-20", "Sarajevo", "hodžić amar.jpg"],
  ];
  // [ime, prezime, datum rođenja, mjesto rođenja]
  const officials = [
    ["Sanin", "Sudar", "1997-07-13", "Sarajevo"],
    ["Edin", "Kuršumlić", null, "Sarajevo"],
    ["Muamer", "Taletović", "1975-04-02", "Sarajevo"],
    ["Hamid", "Balderin", null, "Sarajevo"],
  ];
  const nfc = s => s.normalize("NFC");
  const sources = readdirSync(sourceDir).map(nfc);
  const used = players.map(p => nfc(p[4]));
  if (new Set(used).size !== used.length || used.length !== sources.length || used.some(f => !sources.includes(f))) throw new Error("Photo mapping mismatch.");
  const find = (folder, file) => readdirSync(folder).map(f => `${folder}/${f}`).find(p => nfc(p).endsWith(`/${nfc(file)}`));
  const photos = [];
  const photoFor = (first, last, file) => {
    const original = find(sourceDir, file), source = find(`${dir}cropped`, file);
    if (!original || !source) throw new Error(`Photo missing: ${first} ${last}`);
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${first} ${last}`);
    const photo = {
      index: photos.length + 1, person: `${first} ${last}`, original, source,
      original_sha256: hash(original), sha256: hash(source), size: bytes.length,
      content_type: "image/jpeg", path: `${club_id}/feniks-pioniri-2026-27-${randomUUID()}.jpg`,
    };
    photos.push(photo);
    return photo.path;
  };
  const records = [
    ...players.map(([first_name, last_name, birth_date, birth_place, file], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place, height_cm: null, position: null, license_no: null,
      photo_path: photoFor(first_name, last_name, file), sort: i + 1,
    })),
    ...officials.map(([first_name, last_name, birth_date, birth_place], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role: "Službeno lice",
      first_name, last_name, birth_date, birth_place, height_cm: null, position: null, license_no: null,
      photo_path: null, sort: i + 1,
    })),
  ];
  if (records.length !== 16 || photos.length !== 12) throw new Error("Unexpected roster or photograph counts.");
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK Feniks", team: "Feniks", competition: "Pioniri — Grupa 1", season: "2026/27", club_id, competition_id,
    source: [
      "/Users/tarikvelic/Downloads/LISTA ZA Licenciranje takmičarska sezona    2025-2026.docx",
      "Gmail (tarikvelic23) „slike“ 20.10.2026, 12 photos → /Users/tarikvelic/Downloads/Feniks Pioniri",
    ],
    photos,
    missing_photos: records.filter(r => !r.photo_path).map(r => `${r.first_name} ${r.last_name}`),
    notes: [
      "List names no competition; players born 2012–2016 and the club's only youth team in that range is Feniks in Pioniri — Grupa 1.",
      "Emir Bahuna (player), Edin Kuršumlić and Hamid Balderin (officials) have only a birth year on the list (2016, 1989, 1997); birth_date left empty.",
      "Officials listed without a function; stored as Službeno lice.",
      "List order „Kuršumlić Benjamin“ normalized to Benjamin Kuršumlić; photo „isak pleh“ → Ishak Pleh, „musoovic muhamed“ → Muhamed Mušović.",
      "Photos were phone screenshots or full-body shots; each cropped to a 4:5 head-and-shoulders portrait (black bars, status bars and app UI removed).",
      "Height, position and license numbers not provided. Youth folder comes from the team; no license_folders row needed.",
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
