import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Licence MVP";
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

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  const club_id = "5c4e3a7e-71e4-483b-938d-e81d094b8b10", competition_id = "ad3e34d0-8393-46ec-a464-e0db6a898cb9";
  const before = await (await api(`rest/v1/licenses?select=id&club_id=eq.${club_id}`)).json();
  if (before.length) throw new Error("Existing licenses require reconciliation.");
  save("licenses-before", before);
  const team = await (await api(`rest/v1/teams?select=name,competition:competitions(name,season:seasons(name,is_current))&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (team.length !== 1 || team[0].name !== "MVP" || team[0].competition.name !== "Pioniri — Grupa 1" || !team[0].competition.season.is_current) throw new Error("Team or competition mismatch.");
  // [ime, prezime, datum rođenja, mjesto rođenja, slika]
  const players = [
    ["Nidal", "Šeta", "2013-05-29", "Sarajevo", "nidal seta.jpg"],
    ["Ahmed", "Saračević", "2013-11-17", "Sarajevo", "ahmed saracevic.jpg"],
    ["Vanja", "Arsenovski", "2012-05-11", "Sarajevo", "vanja arsenovski.jpg"],
    ["Azur", "Lizde", "2012-04-17", "Sarajevo", null],
    ["Tarik", "Mujić", "2012-09-03", "Sarajevo", "tarik mujic.jpg"],
    ["Emir", "Letić", "2013-02-25", "Sarajevo", "emir letic.jpg"],
    ["Mak", "Juričev", "2013-11-04", "Sarajevo", "mak juricev.jpg"],
    ["Tarik", "Huseinbašić", "2012-06-06", "Sarajevo", "huseinbasic.jpg"],
    ["Daris", "Sulejmanović", "2012-07-31", "Sarajevo", null],
    ["Nedim", "Nalbantić", "2013-03-05", "Sarajevo", "nedim nalbantic.jpg"],
    ["Khan", "Pezo", "2012-01-24", "Sarajevo", "khan pezo.jpg"],
    ["Faris", "Fejzić", "2012-02-28", "Sarajevo", "faris fejzic.jpg"],
    ["Faruk", "Kaliman", "2012-07-07", "Sarajevo", "faruk  kaliman.jpg"],
    ["Abdulah", "Halilović", "2013-12-30", "Sarajevo", "abdulah halilović.jpg"],
    ["Afan", "Kapo", "2012-07-23", "Sarajevo", "affan kapo.jpg"],
    ["Bakir", "Suljević", "2013-06-22", "Sarajevo", "bakir suljevic.jpg"],
    ["Afan", "Smailji", "2013-03-23", "Sarajevo", null],
    ["Mak", "Kantar", "2012-12-14", "Sarajevo", "mak kantar.jpg"],
    ["Ajdin", "Pihura", "2013-03-03", "Sarajevo", "ajdin pihura.jpg"],
    ["Goran", "Križanović", "2012-03-29", "Sarajevo", "goran krizanović.jpg"],
    ["Džan", "Kazić", "2012-02-21", "Sarajevo", "dzan kazic.jpg"],
    ["Kerim", "Avdagić", "2013-09-08", "München", "keriim avdagić.jpg"],
    ["Rejjan", "Šesto", "2012-11-21", "Sarajevo", "rejjan sesto.jpg"],
    ["Bakir", "Paravlić", "2012-03-15", "Sarajevo", "bakir paravlic.jpg"],
    ["Ajnur", "Kulelija", "2012-02-20", "Sarajevo", "kulelija ajnur.jpg"],
    ["Abdulaziz", "Bećirović", "2013-10-13", "Sarajevo", "abdulaziz becarevic.jpg"],
    ["Imran", "Imamović", "2012-07-22", null, "imran imamovic.jpg"],
  ];
  const officials = [
    ["Senad", "Redžić", "Trener"],
    ["Vedran", "Oručević", "Trener"],
  ];
  const files = readdirSync(sourceDir).filter(f => /\.jpe?g$/i.test(f)).map(f => f.normalize("NFC"));
  const used = players.map(p => p[4]).filter(Boolean).map(f => f.normalize("NFC"));
  if (new Set(used).size !== used.length || files.length !== used.length || used.some(f => !files.includes(f))) throw new Error("Photo mapping mismatch.");
  const photos = [];
  const photoFor = (first, last, file) => {
    if (!file) return null;
    const original = readdirSync(sourceDir).map(f => `${sourceDir}/${f}`).find(p => p.normalize("NFC").endsWith(`/${file.normalize("NFC")}`));
    const source = readdirSync(`${dir}cropped`).map(f => `${dir}cropped/${f}`).find(p => p.normalize("NFC").endsWith(`/${file.normalize("NFC")}`));
    if (!original || !source) throw new Error(`Photo missing: ${first} ${last}`);
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${first} ${last}`);
    const photo = {
      index: photos.length + 1, person: `${first} ${last}`, original, source,
      original_sha256: hash(original), sha256: hash(source), size: bytes.length,
      content_type: "image/jpeg", path: `${club_id}/mvp-pioniri-2026-27-${randomUUID()}.jpg`,
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
    ...officials.map(([first_name, last_name, role], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role,
      first_name, last_name, birth_date: null, birth_place: null, height_cm: null, position: null, license_no: null,
      photo_path: null, sort: i + 1,
    })),
  ];
  if (records.length !== 29 || photos.length !== 24) throw new Error("Unexpected roster or photograph counts.");
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK MVP", team: "MVP", competition: "Pioniri — Grupa 1", season: "2026/27", club_id, competition_id,
    source: "/Users/tarikvelic/Downloads/PIONIRI SPISAK. 2026-27.docx", photos,
    missing_photos: records.filter(r => !r.photo_path).map(r => `${r.first_name} ${r.last_name}`),
    notes: [
      "26 players, birth dates and places from the club DOCX; heights, positions and license numbers not provided.",
      "Imran Imamović is not on the DOCX; added as player 27 per the user (born 2012-07-22, birth place unknown).",
      "Senad Redžić (trener) and Vedran Oručević (pomoćni trener) stored with role Trener; no official photos provided.",
      "Phone screenshots cropped to the photograph (status bars, chat headers, captions and overlays removed).",
      "Photo filenames differ from roster spelling (becarevic, affan, keriim, huseinbasic); roster spelling used.",
      "Youth folder comes from the team in Pioniri — Grupa 1; no license_folders row needed.",
    ],
  });
  console.log(JSON.stringify({ players: players.length, official_licenses: officials.length, unique_photos: photos.length }));
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
  const actual = await (await api(`rest/v1/licenses?select=*&club_id=eq.${manifest.club_id}&order=kind,sort`)).json();
  save("licenses-after", actual);
  const own = actual.filter(r => r.competition_id === manifest.competition_id);
  if (own.length !== expected.length) throw new Error("Record count mismatch.");
  for (const r of expected) {
    const stored = own.find(a => a.id === r.id);
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
    players: own.filter(r => r.kind === "player").length, official_licenses: own.filter(r => r.kind === "official").length,
    unique_photos_verified: manifest.photos.length, records_with_photos: own.filter(r => r.photo_path).length,
    missing_photos: manifest.missing_photos, all_fields_match: true,
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --import or --verify.");
}
