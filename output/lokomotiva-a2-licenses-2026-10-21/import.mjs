import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Lokomotiva";
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
  const club_id = "1d06ba2c-c999-4e14-b256-f41a7c5bcd07", competition_id = "d74bc0b4-99f1-4313-8c15-463f76d06764";
  const before = await (await api(`rest/v1/licenses?select=id&club_id=eq.${club_id}`)).json();
  if (before.length) throw new Error("Existing licenses require reconciliation.");
  save("licenses-before", before);
  const team = await (await api(`rest/v1/teams?select=name,competition:competitions(name,season:seasons(name,is_current))&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (team.length !== 1 || team[0].name !== "Lokomotiva" || team[0].competition.name !== "A2 liga jug KSBiH" || !team[0].competition.season.is_current) throw new Error("Team or competition mismatch.");
  const folder = await (await api(`rest/v1/license_folders?select=club_id&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (folder.length !== 1) throw new Error("License folder missing.");
  // [ime, prezime, datum rođenja, mjesto rođenja, visina, pozicija, slika]
  const players = [
    ["Faris", "Dudić", "2005-03-22", "Mostar", 203, "C", "Faris Dudić 2.jpg"],
    ["Dino", "Ćehajić", "2006-09-09", "Mostar", 193, "SF", "Dino Ćehajić.jpg"],
    ["Eman", "Fazlagić", "2008-06-13", "Mostar", 196, "PF", "Eman Fazlagić.jpg"],
    ["Kerim", "Šuta", "2009-03-21", "Mostar", 190, "SG", "Kerim Šuta.jpg"],
    ["Timur", "Dudić", "2008-05-09", "Mostar", 190, "SG", "Timur Dudić.jpg"],
    ["Ajdin", "Mustafić", "2010-05-30", "Mostar", 190, "SF", "Ajdin Mustafić 1.jpg"],
    ["Benjamin", "Ćehajić", "2010-09-20", "Mostar", 186, "SG", "Benjamin Ćehajić.jpg"],
    ["Velid", "Ugarak", "2005-01-09", "Travnik", 178, "PG", "Velid Ugarak.jpg"],
    ["Nedim", "Zlomužica", "2004-01-09", "Konjic", 194, "SG", "Nedim Zlomužica.jpg"],
    ["Kenan", "Ćušić", "2011-09-19", "Mostar", 180, "PG", "Kenan Ćušić.jpg"],
    ["Amar", "Vele", "2010-12-22", "Mostar", 191, "SF", "Amar Vele.jpg"],
    ["Petar", "Ivanišević", "2011-04-07", "Mostar", 188, "SF", "Petar Ivanišević.jpg"],
    ["Dino", "Gosto", "2011-03-19", "Mostar", 182, "SF", "Dino Gosto.jpg"],
    ["Mirza", "Ždralović", "2008-07-01", "Sarajevo", 184, "PG", "Mirza Ždralović.jpg"],
    ["Rejhan", "Džiho", "2011-03-01", "Mostar", 186, "PG", "Rejhan Džiho.jpg"],
    ["Daris", "Ćumurija", "2009-01-11", "Mostar", 192, "SF", "Daris Ćumurija.jpg"],
    ["Omar", "Marić", "2011-09-06", "Mostar", 195, "PF", "Omar Marić.jpg"],
    ["Dino", "Kukuruzović", "2010-11-20", "Mostar", 190, "SG", "Dino Kukuruzović.jpg"],
  ];
  // [ime, prezime, funkcija, slika]
  const officials = [
    ["Dženan", "Šuta", "Trener", "Dženan Šuta 1.jpg"],
    ["Amel", "Salčin", "Trener", null],
    ["Faris", "Čolić", "Trener", "Čolić Faris.jpg"],
    ["Adi", "Ćorić", "Ljekar", "dr. Adi Ćorić.jpg"],
    ["Samer", "Balavac", "Službeno lice", "Samer Balavac.jpg"],
    ["Edib", "Voljevica", "Službeno lice", "Edib Voljevica.jpg"],
  ];
  const files = readdirSync(sourceDir).filter(f => /\.jpe?g$/i.test(f)).map(f => f.normalize("NFC"));
  const used = [...players.map(p => p[6]), ...officials.map(o => o[3])].filter(Boolean).map(f => f.normalize("NFC"));
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
      content_type: "image/jpeg", path: `${club_id}/lokomotiva-2026-27-${randomUUID()}.jpg`,
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
    ...officials.map(([first_name, last_name, role, file], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role,
      first_name, last_name, birth_date: null, birth_place: null, height_cm: null, position: null, license_no: null,
      photo_path: photoFor(first_name, last_name, file), sort: i + 1,
    })),
  ];
  if (records.length !== 24 || photos.length !== 23) throw new Error("Unexpected roster or photograph counts.");
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK Lokomotiva J&A", team: "Lokomotiva", competition: "A2 liga jug KSBiH", season: "2026/27", club_id, competition_id,
    source: "/Users/tarikvelic/Downloads/Lokomotiva/Spisak igrača registracija A2 2026-27 Lokomotiva.pdf", photos,
    missing_photos: records.filter(r => !r.photo_path).map(r => `${r.first_name} ${r.last_name} (${r.role ?? "igrač"})`),
    notes: [
      "18 players and 6 official licenses from the signed, scanned KSBiH list (KK Lokomotiva Mostar).",
      "Amar Vele birth date on the list is 22.12.2026 (typo); 22.12.2010 taken from the club's medical exam list (LJEKARSKI 2026-27.pdf).",
      "All other birth dates match the medical exam list where present.",
      "Positions normalized: 1 → PG, 2 → SG, 3 → SF, 4 → PF, 5 → C.",
      "Dual registrations per list: Mirza Ždralović (KK Turbina Jablanica); Rejhan Džiho, Daris Ćumurija, Omar Marić, Dino Kukuruzović (J&A Akademija Mostar).",
      "Doctor title dr. omitted from first_name; Adi Ćorić has role Ljekar.",
      "Amel Salčin (Trener) has no photograph; license numbers blank.",
      "LJEKARSKI 2026-27.pdf is a supporting document, not uploaded.",
      "License folder for Lokomotiva in A2 liga jug already existed; not recreated.",
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
