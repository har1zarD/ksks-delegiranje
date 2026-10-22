import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Point A2";
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

const club_id = "436f8af2-7691-4a1b-8666-71057277d861";
const competition_id = "d74bc0b4-99f1-4313-8c15-463f76d06764";

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  const before = await (await api(`rest/v1/licenses?select=id&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (before.length) throw new Error("Existing licenses require reconciliation.");
  save("licenses-before", before);
  const team = await (await api(`rest/v1/teams?select=name,competition:competitions(name,season:seasons(name,is_current))&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (team.length !== 1 || team[0].name !== "Point" || team[0].competition.name !== "A2 liga jug KSBiH" || !team[0].competition.season.is_current) throw new Error("Team or competition mismatch.");
  const folders = await (await api(`rest/v1/license_folders?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (folders.length !== 1) throw new Error("Folder missing.");
  // [prezime, ime, godina sa spiska, datum iz pasoša, mjesto, visina, pozicija 1–5, slika, izrezana]
  const players = [
    ["Muhedinović", "Adi", 2009, null, "Tuzla", 190, 2, "Slika-Muhedinović Adi.jpg", false],
    ["Čatal", "Bakir", 2008, null, "Tuzla", 188, 2, "Slika-Čatal Bakir.jpg", false],
    ["Pešto", "Emin", 2009, null, "Sarajevo", 188, 1, null, false],
    ["Lokvančić", "Tarik", 2009, "2009-08-08", "Sarajevo", 185, 2, "Slika-Lokvančić Tarik.jpg", false],
    ["Duranović", "Vedad", 2009, null, "Sarajevo", 187, 1, null, false],
    ["Uzeirbegović", "Adi", 2008, "2008-04-27", "Sarajevo", 187, 1, "Slika-Uzeirbegović Adi.jpg", true],
    ["Popić", "Andrej", 2008, null, "Istočno Sarajevo", 180, 1, null, false],
    ["Habota", "Emir", 2009, "2009-06-26", "Sarajevo", 197, 5, "Slika-Habota Emir.jpg", false],
    ["Musić", "Amar", 2007, null, "Sarajevo", 204, 5, null, false],
    ["Nurkić", "Kenan", 2007, null, "Tuzla", 209, 5, null, false],
    ["Ramić", "Džanan", 2008, "2008-05-14", "Bihać", 200, 4, "slika-Ramić Dzanan.jpg", false],
    ["Sprečić", "Danis", 2007, "2007-08-04", "Tuzla", 200, 4, "Slika-Sprečić Danis.jpg", true],
    ["Lukavica", "Samid", 2009, "2009-07-12", "Bengazi", 195, 3, "Slika-Lukavica Samid.jpg", true],
    ["Masleša", "Omar", 2010, "2010-02-12", "Konjic", 180, 1, "Slika-Masleša Omar.jpg", false],
    ["Hadžić", "Emir", 2007, "2007-12-10", "Tuzla", 196, 4, "Slika-Hadzić Emir.jpg", false],
    ["Brekalović", "Mak", 2009, "2009-10-20", "Sarajevo", 189, 3, "Slika-Brekalović Mak.jpg", true],
    ["Varaga", "Adrijan", 2009, null, "Sarajevo", 200, 5, null, false],
  ];
  const officials = [
    ["Muminović", "Mirnes", "Trener"],
    ["Mujezinović", "Adis", "Službeno lice"],
    ["Kapetanović", "Hermin", "Službeno lice"],
  ];
  for (const [last, first, year, date] of players) if (date && Number(date.slice(0, 4)) !== year) throw new Error(`Passport year differs from list: ${first} ${last}`);
  const positions = { 1: "PG", 2: "SG", 3: "SF", 4: "PF", 5: "C" };
  const nfc = s => s.normalize("NFC");
  const find = (folder, file) => readdirSync(folder).map(f => `${folder}/${f}`).find(p => nfc(p).endsWith(`/${nfc(file)}`));
  const photos = [];
  const photoFor = (first, last, file, cropped) => {
    if (!file) return null;
    const original = find(sourceDir, file), source = cropped ? find(`${dir}cropped`, file) : original;
    if (!original || !source) throw new Error(`Photo missing: ${first} ${last}`);
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${first} ${last}`);
    const photo = {
      index: photos.length + 1, person: `${first} ${last}`, original, source,
      original_sha256: hash(original), sha256: hash(source), size: bytes.length,
      content_type: "image/jpeg", path: `${club_id}/point-a2-2026-27-${randomUUID()}.jpg`,
    };
    photos.push(photo);
    return photo.path;
  };
  const records = [
    ...players.map(([last_name, first_name, , birth_date, birth_place, height_cm, position, file, cropped], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place, height_cm, position: positions[position], license_no: null,
      photo_path: photoFor(first_name, last_name, file, cropped), sort: i + 1,
    })),
    ...officials.map(([last_name, first_name, role], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role,
      first_name, last_name, birth_date: null, birth_place: null, height_cm: null, position: null, license_no: null,
      photo_path: null, sort: i + 1,
    })),
  ];
  const portraits = readdirSync(sourceDir).filter(f => /\.jpe?g$/i.test(f) && !/, (pasoš|ispisnica)\.jpg$/i.test(nfc(f)));
  if (portraits.length !== photos.length || portraits.some(f => !photos.some(p => nfc(p.original).endsWith(`/${nfc(f)}`)))) throw new Error("Unmapped portrait photos.");
  if (records.length !== 20 || photos.length !== 11) throw new Error("Unexpected roster or photograph counts.");
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK Point", team: "Point", competition: "A2 liga jug KSBiH", season: "2026/27", club_id, competition_id,
    source: [
      "Email „FW: Spisak igrača, slike...“ (kk.point.ilidza 21.10.2026 16:41 + 18:59), 22 attachments → /Users/tarikvelic/Downloads/Point A2",
      "/Users/tarikvelic/Downloads/Point A2/spisak za licenciranje A2 JUG - 2026-2027 FINAL 1.doc",
    ],
    photos,
    missing_photos: records.filter(r => !r.photo_path).map(r => `${r.first_name} ${r.last_name}`),
    notes: [
      "The list gives only a birth year (with „dvojna“ / „dvojna Igman“ remarks). Full birth dates taken from the 9 passport scans (visual zone, checked against the MRZ and the list year); the other 8 players have birth_date empty.",
      "Spelling from passports: Brekalović (list „Brakalović“), Hadžić (list/photo „Hadzić“), Džanan (list „Dzanan“). Muhedinović spelled as in the photo file name (list „Muhedinovic“).",
      "Samid Lukavica: list place Tuzla, passport place of birth Bengazi — passport used.",
      "Positions 1–5 normalized to PG/SG/SF/PF/C; Adi Muhedinović „2-3“ stored as SG.",
      "Dual registrations per list: Muhedinović, Pešto, Lokvančić, Duranović, Habota, Lukavica, Masleša („dvojna“); Čatal, Nurkić, Ramić („dvojna Igman“). Brekalović has an ispisnica attached.",
      "Brekalović, Lukavica, Sprečić and Uzeirbegović photos cropped to head and shoulders (4:5); the rest uploaded unchanged. Passport and ispisnica scans are not uploaded.",
      "No photos for Pešto, Duranović, Popić, Musić, Nurkić, Varaga or the 3 officials. A2 license folder already existed; no license numbers assigned.",
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
