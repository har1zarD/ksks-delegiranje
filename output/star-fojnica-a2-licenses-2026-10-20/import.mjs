import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/StarFojnica";
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
  const clubs = read("club");
  const competitions = read("competitions").filter(c => c.name === "A2 liga jug KSBiH" && c.season.is_current && c.season.name === "2026/27");
  if (clubs.length !== 1 || clubs[0].id !== "99aac297-8c60-440c-a03b-75b9a9d8df66" || competitions.length !== 1) throw new Error("Club or competition mismatch.");
  const club_id = clubs[0].id, competition_id = competitions[0].id;
  if (read("licenses-before").length) throw new Error("Existing licenses require reconciliation.");
  const players = [
    ["Durak", "Faris", "2005-10-17", "Fojnica", 188, 1],
    ["Nenadić", "Tin", "2006-03-20", "Nova Bila", 195, 3],
    ["Kučuk", "Amar", "2006-06-15", "Fojnica", 197, 5],
    ["Mujić", "Atif", "2010-11-02", "Kiseljak", 188, 2],
    ["Mušanović", "Mirza", "2009-06-11", "Fojnica", 195, 4],
    ["Barbarić", "Pavle", "2008-06-18", "Nova Bila", 186, 2],
    ["Barbarić", "Luka", "2007-05-04", "Nova Bila", 186, 2],
    ["Čengić", "Nedžib", "2005-09-16", "Sarajevo", 195, 5],
    ["Trogrančić", "Milan", "2009-07-28", "Nova Bila", 190, 3],
    ["Vidović", "Leo", "2008-09-17", "Nova Bila", 192, 4],
    ["Čizmić", "Imran", "2004-08-19", "Kiseljak", 190, 1],
    ["Čohadžić", "Idris", "2007-12-08", "Fojnica", 197, 3],
    ["Dilber", "Filip", "2008-12-12", "Nova Bila", 185, 1],
    ["Huzbašić", "Edin", "2010-03-12", "Fojnica", 185, 1],
    ["Topalović", "Bekir", "2010-04-03", "Fojnica", 185, 1],
    ["Sejdić", "Dalijan", "2009-05-24", "Kiseljak", 190, 2],
    ["Ejubović", "Faris", "2005-06-20", "Travnik", 190, 2],
    ["Huseinbašić", "Enis", "2009-11-19", "Fojnica", 190, 4],
  ];
  const officials = [
    ["Oroz", "Hrvoje", "Trener"],
    ["Kučuk", "Samir", "Trener"],
    ["Karalija", "Muris", "Trener"],
    ["Klisura", "Adis", "Fizioterapeut"],
    ["Kučuk", "Samir", "Službeno lice"],
  ];
  const photoFiles = {
    "Oroz Hrvoje": "OROZ HRVOJE - TRENER.jpg",
    "Klisura Adis": "KLISURA ADIS - FIZIO.jpeg",
  };
  const rotated = new Set(["DURAK FARIS.jpg", "OROZ HRVOJE - TRENER.jpg", "ČOHADŽIĆ IDRIS.jpg"]);
  const missing = new Set(["Kučuk Samir", "Karalija Muris"]);
  const unidentified = ["IMG_20261015_122530.jpg"];
  const normalize = text => text.normalize("NFC").toLocaleUpperCase("bs");
  const files = readdirSync(sourceDir).filter(f => /\.jpe?g$/i.test(f));
  const photos = [], byFile = new Map();
  const photoFor = (last, first) => {
    const fullName = `${last} ${first}`;
    if (missing.has(fullName)) return null;
    const wanted = photoFiles[fullName];
    const matches = files.filter(f => wanted ? f.normalize("NFC") === wanted.normalize("NFC") : normalize(f.replace(/\.jpe?g$/i, "")) === normalize(fullName));
    if (matches.length !== 1) throw new Error(`Photo mismatch: ${fullName}`);
    const file = matches[0], original = `${sourceDir}/${file}`;
    if (byFile.has(file)) return byFile.get(file).path;
    const upright = rotated.has(file.normalize("NFC"));
    const source = upright ? `${dir}upright/${file}` : original;
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${fullName}`);
    const photo = {
      index: photos.length + 1, person: `${first} ${last}`, original, source,
      original_sha256: hash(original), sha256: hash(source), size: bytes.length,
      content_type: "image/jpeg", path: `${club_id}/star-fojnica-2026-27-${randomUUID()}.jpg`,
    };
    photos.push(photo);
    byFile.set(file, photo);
    return photo.path;
  };
  const positions = { 1: "PG", 2: "SG", 3: "SF", 4: "PF", 5: "C" };
  const records = [
    ...players.map(([last_name, first_name, birth_date, birth_place, height_cm, position], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place, height_cm,
      position: positions[position], license_no: null,
      photo_path: photoFor(last_name, first_name), sort: i + 1,
    })),
    ...officials.map(([last_name, first_name, role], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role,
      first_name, last_name, birth_date: null, birth_place: null,
      height_cm: null, position: null, license_no: null,
      photo_path: photoFor(last_name, first_name), sort: i + 1,
    })),
  ];
  if (records.length !== 23 || photos.length !== 20 || records.filter(r => !r.photo_path).length !== 3) throw new Error("Unexpected roster or photograph counts.");
  const unmapped = files.filter(f => !byFile.has(f) && !unidentified.includes(f));
  if (unmapped.length) throw new Error(`Unmapped photos: ${unmapped.join(", ")}`);
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: clubs[0].name, team: "Star Fojnica", competition: competitions[0].name,
    season: "2026/27", club_id, competition_id,
    source: `${sourceDir}/pdf/OVJEREN SPISAK ZA LICENCIRANJE.pdf`, photos,
    missing_photos: [...missing], unidentified_photos: unidentified,
    notes: [
      "Roster, birth dates, places and heights copied from the certified KSBiH list (MJESTO → birth_place).",
      "Positions normalized: 1 → PG, 2 → SG, 3 → SF, 4 → PF, 5 → C.",
      "Samir Kučuk has two separate official licenses (Trener and Službeno lice).",
      "IMG_20261015_122530.jpg shows an unnamed adult official; not assigned until identified (Kučuk Samir or Karalija Muris).",
      "Durak, Oroz and Čohadžić photos had EXIF rotation; re-encoded upright because the PDF renderer ignores EXIF.",
      "Dual-license consents: Nedžib Čengić (KK Bošnjak Hadžići), Faris Ejubović (KK Travnik).",
      "Medical certificate not yet received; club said it will send it the next day.",
    ],
  });
  console.log(JSON.stringify({ players: players.length, official_licenses: officials.length, unique_photos: photos.length, missing_photos: [...missing] }));
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
  const folders = await (await api(`rest/v1/license_folders?select=*&club_id=eq.${manifest.club_id}&competition_id=eq.${manifest.competition_id}`)).json();
  if (folders.length !== 1) throw new Error("Folder missing.");
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
