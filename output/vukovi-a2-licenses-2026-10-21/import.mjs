import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Vukovi";
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
  const club_id = "3d01197f-2001-4b0e-82f3-0e98e490a5ba", competition_id = "d74bc0b4-99f1-4313-8c15-463f76d06764";
  const before = await (await api(`rest/v1/licenses?select=id&club_id=eq.${club_id}`)).json();
  if (before.length) throw new Error("Existing licenses require reconciliation.");
  save("licenses-before", before);
  const team = await (await api(`rest/v1/teams?select=name,competition:competitions(name,season:seasons(name,is_current))&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (team.length !== 1 || team[0].name !== "Vukovi" || team[0].competition.name !== "A2 liga jug KSBiH" || !team[0].competition.season.is_current) throw new Error("Team or competition mismatch.");
  const folder = await (await api(`rest/v1/license_folders?select=club_id&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (folder.length !== 1) throw new Error("License folder missing.");
  // [ime, prezime, datum rođenja, mjesto rođenja, visina, pozicija, slika]
  const players = [
    ["Dajan", "Kojić", "2008-07-15", "Zenica", 186, "SG", "Kojic_Dajan.jpg"],
    ["Harun", "Zukić", "2010-03-10", "Zenica", 194, "SG", "Zukic_Harun.jpg"],
    ["Vedran", "Pojskić", "2009-04-25", "Zenica", 187, "SG", "Pojskic_Vedran.jpg"],
    ["Ladis", "Kobaš", "2011-07-04", "Zenica", 186, "SF", "Kobas_Ladis.jpg"],
    ["Ibrahim", "Hodžić", "2009-03-03", "Zenica", 186, "SG", "Hodzic_Ibrahim.jpg"],
    ["Amar", "Bajramović", "2010-09-23", "Zenica", 189, "SG", "Bajramovic_Amar.jpg"],
    ["Tanay", "Mlačo", "2011-02-11", "Zenica", 184, "SG", "Mlaco_Tanay.jpg"],
    ["Deni", "Šunjić", "2008-10-07", "Zenica", 190, "SF", "Sunjic_Deni.jpg"],
    ["Arslan", "Patković", "2010-04-21", "Zenica", 191, "C", "Patkovic_Arslan.jpg"],
    ["Malik", "Agić", "2008-08-15", "Žepče", 185, "SF", "Agic_Malik.jpg"],
    ["Lejnad", "Gavranović", "2008-08-11", "Zenica", 191, "SF", "Gavranovic_Lejnad.jpg"],
    ["Sani", "Skejić", "2009-12-14", "Zenica", 188, "SG", "Skejic_Sani.jpg"],
    ["Feđa", "Čabaravdić", "2008-12-01", "Zenica", 181, "SG", "Cabarabdic_Fedja.jpg"],
    ["Denijal", "Karović", "2008-09-25", "Zenica", 185, "SG", "Karovic_Denijal.jpg"],
    ["Erik", "Smajlović", "2008-09-10", "Zenica", 188, "SF", "Smajlovic_Erik.jpg"],
    ["Sami", "Musić", "2010-06-05", "Zenica", 191, "SF", "Music_Sami.jpg"],
    ["Ejmen", "Daković", "2011-08-28", "Zenica", 189, "SG", "Dakovic_Ejmen.jpg"],
    ["Faruk", "Pripoljac", "2011-01-28", "Zenica", 186, "SG", "Pripoljac_Faruk.jpg"],
  ];
  const officials = [
    ["Dino", "Duranović", "Trener"],
    ["Harun", "Čolić", "Trener"],
    ["Aldin", "Berbić", "Trener"],
    ["Boris", "Ćuković", "Fizioterapeut"],
    ["Faruk", "Čolić", "Službeno lice"],
    ["Amir", "Zukić", "Službeno lice"],
    ["Harun", "Čolić", "Službeno lice"],
  ];
  const files = readdirSync(sourceDir).filter(f => /\.jpe?g$/i.test(f)).map(f => f.normalize("NFC"));
  const used = players.map(p => p[6]).filter(Boolean).map(f => f.normalize("NFC"));
  if (new Set(used).size !== used.length || files.length !== used.length || used.some(f => !files.includes(f))) throw new Error("Photo mapping mismatch.");
  const photos = [];
  const photoFor = (first, last, file) => {
    if (!file) return null;
    const source = readdirSync(sourceDir).map(f => `${sourceDir}/${f}`).find(p => p.normalize("NFC").endsWith(`/${file.normalize("NFC")}`));
    if (!source) throw new Error(`Photo missing: ${first} ${last}`);
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${first} ${last}`);
    const photo = {
      index: photos.length + 1, person: `${first} ${last}`, source,
      sha256: hash(source), size: bytes.length,
      content_type: "image/jpeg", path: `${club_id}/vukovi-2026-27-${randomUUID()}.jpg`,
    };
    photos.push(photo);
    return photo.path;
  };
  const records = [
    ...players.map(([first_name, last_name, birth_date, birth_place, height_cm, position, file], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place, height_cm, position, license_no: null,
      photo_path: photoFor(first_name, last_name, file), sort: i + 1,
    })),
    ...officials.map(([first_name, last_name, role], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role,
      first_name, last_name, birth_date: null, birth_place: null, height_cm: null, position: null, license_no: null,
      photo_path: null, sort: i + 1,
    })),
  ];
  if (records.length !== 25 || photos.length !== 18) throw new Error("Unexpected roster or photograph counts.");
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK Vukovi", team: "Vukovi", competition: "A2 liga jug KSBiH", season: "2026/27", club_id, competition_id,
    source: "/Users/tarikvelic/Downloads/Vukovi/Licence A2 Jug Vukovi.doc", photos,
    missing_photos: records.filter(r => !r.photo_path).map(r => `${r.first_name} ${r.last_name} (${r.role ?? "igrač"})`),
    notes: [
      "18 players and 7 official licenses from the club DOC (emailed to KS Zenica, forwarded by KSKS on 2026-10-21).",
      "Names and birth places converted from uppercase to title case.",
      "Positions normalized: Bek → SG, Krilo → SF, Centar → C.",
      "Harun Čolić has two separate official licenses (Trener and Službeno lice).",
      "Cabarabdic_Fedja.jpg mapped to Feđa Čabaravdić (spelling on the list).",
      "No official photographs or birth details were provided; license numbers blank.",
      "License folder for KK Vukovi in A2 liga jug already existed; not recreated.",
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
