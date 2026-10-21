import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Ilidza Orange/Licenciranje/Licenciranje";
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

const club_id = "370294d2-5ab0-4ac7-9ebb-fc1637027a82";
const teams = [
  { slug: "kadeti", competition_id: "e5da2f34-3891-40b5-b946-9484f3750e34", competition: "Kadeti — Grupa 1" },
  { slug: "pioniri", competition_id: "ad3e34d0-8393-46ec-a464-e0db6a898cb9", competition: "Pioniri — Grupa 1" },
];

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  const before = await (await api(`rest/v1/licenses?select=id&club_id=eq.${club_id}&competition_id=in.(${teams.map(t => t.competition_id)})`)).json();
  if (before.length) throw new Error("Existing licenses require reconciliation.");
  save("licenses-before", before);
  for (const t of teams) {
    const team = await (await api(`rest/v1/teams?select=name,competition:competitions(name,season:seasons(name,is_current))&club_id=eq.${club_id}&competition_id=eq.${t.competition_id}`)).json();
    if (team.length !== 1 || team[0].name !== "Ilidža Orange" || team[0].competition.name !== t.competition || !team[0].competition.season.is_current) throw new Error(`Team or competition mismatch: ${t.competition}`);
  }
  // [ime, prezime, datum rođenja, mjesto rođenja, slika]
  const rosters = {
    kadeti: [
      ["Rejhan", "Polimac", "2010-10-09", "Sarajevo", "Rejhan Polimac 2010..jpg"],
      ["Džan", "Krupalija", "2011-05-31", "Sarajevo", "converted/Džan Krupalija 2011..jpg"],
      ["Zlatan", "Valjevac", "2011-07-11", "Sarajevo", "Zlatan Valjevac 2011..JPG"],
      ["Marko", "Kostić", "2011-07-21", "I. Sarajevo", "Marko Kostić 2012..JPG"],
      ["Benjamin", "Kadrić", "2011-09-18", "Sarajevo", "Benjamin Kadrić 2011..jpg"],
      ["Hamza", "Hamzić", "2012-04-12", "Sarajevo", "Hamza Hamzić 2012..JPG"],
      ["Ahmed", "Čehić", "2012-01-21", "Sarajevo", "Ahmed Čehić 2012..jpg"],
      ["Ali", "Sakoč", "2013-03-10", "Sarajevo", "Ali Sakoč 2013..JPG"],
      ["Fejsal", "Bajrović", "2013-03-21", "Sarajevo", "Fejsal Bajrović 2013..JPG"],
      ["Haris", "Numanović", "2012-04-20", "Sarajevo", "Haris Numanović 2012..JPG"],
      ["Zlatan", "Karić", "2012-05-23", "Sarajevo", "Zlatan Karić 2012..JPG"],
      ["Dani", "Fazlić", "2011-03-24", "Sarajevo", "Dani Fazlić 2011..JPG"],
      ["Sami", "Jamaković", "2011-09-16", "Sarajevo", "Sami Jamaković 2011..JPG"],
      ["Damir", "Mihaljević", "2012-11-15", "Sarajevo", "Damir Mihaljević 2012..JPG"],
    ],
    pioniri: [
      ["Hamza", "Hamzić", "2012-04-12", "Sarajevo", "Hamza Hamzić 2012..JPG"],
      ["Ahmed", "Čehić", "2012-01-21", "Sarajevo", "Ahmed Čehić 2012..jpg"],
      ["Ali", "Sakoč", "2013-03-10", "Sarajevo", "Ali Sakoč 2013..JPG"],
      ["Haris", "Numanović", "2012-04-20", "Sarajevo", "Haris Numanović 2012..JPG"],
      ["Fejsal", "Bajrović", "2013-03-21", "Sarajevo", "Fejsal Bajrović 2013..JPG"],
      ["Zlatan", "Karić", "2012-05-23", "Sarajevo", "Zlatan Karić 2012..JPG"],
      ["Damir", "Mihaljević", "2012-11-15", "Sarajevo", "Damir Mihaljević 2012..JPG"],
      ["Abdulhadi", "Karić", "2012-07-24", "Sarajevo", "Abdulhadi Karić 2012..JPG"],
      ["Adi", "Čerkez", "2012-10-26", "Sarajevo", "Adi Čerkez 2012..JPG"],
      ["Alen", "Curo", "2012-11-23", "Sarajevo", "Alen Curo 2012..JPG"],
      ["Sandon", "Dizdarević", "2012-02-07", "Sarajevo", "Sandon Dizdarević 2012..JPG"],
      ["Benjamin", "Milić", "2012-07-06", "Sarajevo", "Benjamin Milić 2012..JPG"],
      ["Davud", "Ajanović", "2012-12-11", "Sarajevo", "Davud Ajanović 2012..JPG"],
      ["Adrian", "Karajić", "2013-04-30", "Sarajevo", "Adrian Karajić 2013..JPG"],
    ],
  };
  // [ime, prezime, uloga, datum rođenja, mjesto rođenja, slika]
  const officials = [
    ["Enes", "Numanović", "Trener", "1976-10-12", "Sarajevo", "Enes Numanović (trener).jpg"],
    ["Nedim", "Fejzić", "Trener", "1982-08-15", "Sarajevo", "converted/Nedim Fejzić (trener).jpg"],
  ];
  const sourceFiles = readdirSync(sourceDir).filter(f => !/\.heic$/i.test(f)).map(f => f.normalize("NFC"));
  const used = new Set([...Object.values(rosters).flat().map(p => p[4]), ...officials.map(o => o[5])].filter(f => !f.startsWith("converted/")).map(f => f.normalize("NFC")));
  if (used.size !== sourceFiles.length || sourceFiles.some(f => !used.has(f))) throw new Error("Photo mapping mismatch.");
  const photos = [];
  const photoFor = (slug, first, last, file) => {
    const folder = file.startsWith("converted/") ? `${dir}converted` : sourceDir;
    const name = file.replace(/^converted\//, "").normalize("NFC");
    const source = readdirSync(folder).map(f => `${folder}/${f}`).find(p => p.normalize("NFC").endsWith(`/${name}`));
    if (!source) throw new Error(`Photo missing: ${first} ${last}`);
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${first} ${last}`);
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`Not a JPEG: ${source}`);
    const photo = {
      index: photos.length + 1, person: `${first} ${last}`, team: slug, source,
      sha256: hash(source), size: bytes.length, content_type: "image/jpeg",
      path: `${club_id}/ilidza-orange-${slug}-2026-27-${randomUUID()}.jpg`,
    };
    photos.push(photo);
    return photo.path;
  };
  const records = teams.flatMap(({ slug, competition_id }) => [
    ...rosters[slug].map(([first_name, last_name, birth_date, birth_place, file], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place, height_cm: null, position: null, license_no: null,
      photo_path: photoFor(slug, first_name, last_name, file), sort: i + 1,
    })),
    ...officials.map(([first_name, last_name, role, birth_date, birth_place, file], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role,
      first_name, last_name, birth_date, birth_place, height_cm: null, position: null, license_no: null,
      photo_path: photoFor(slug, first_name, last_name, file), sort: i + 1,
    })),
  ]);
  if (records.length !== 32 || photos.length !== 32) throw new Error("Unexpected roster or photograph counts.");
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK Ilidža", team: "Ilidža Orange", season: "2026/27", club_id, teams,
    source: [
      "/Users/tarikvelic/Downloads/Ilidza Orange/KK ILIDŽA ORANGE - KADETI - LISTA ZA Licenciranje takmičarska sezona 2026-2027.doc",
      "/Users/tarikvelic/Downloads/Ilidza Orange/KK ILIDŽA ORANGE - PIONIRI - LISTA ZA Licenciranje takmičarska sezona 2026-2027.doc",
      "/Users/tarikvelic/Downloads/Ilidza Orange/Licenciranje.zip",
    ],
    photos,
    notes: [
      "Email 21.10.2026 (Nedim Fejzić via KSKS): Kadeti G1 14 players, Pioniri G1 14 players (7 on both), 2 coaches on both lists.",
      "Heights, positions and license numbers not provided. Coaches' birth dates and places taken from the lists.",
      "HEIC photos (Džan Krupalija, Nedim Fejzić) converted to JPEG with sips; other photos uploaded unchanged.",
      "Each license gets its own storage object, so players on both lists have two copies of the same photo.",
      "Marko Kostić photo filename says 2012; list says 21.07.2011 — list used. Birth place kept as written: I. Sarajevo.",
      "Youth folders come from the Ilidža Orange teams in both competitions; no license_folders rows needed.",
    ],
  });
  console.log(JSON.stringify({ records: records.length, photos: photos.length }));
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
  const ids = manifest.teams.map(t => t.competition_id);
  const actual = await (await api(`rest/v1/licenses?select=*&club_id=eq.${club_id}&competition_id=in.(${ids})&order=competition_id,kind,sort`)).json();
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
  const count = (t, kind) => actual.filter(r => r.competition_id === t.competition_id && r.kind === kind).length;
  const result = {
    verified_at: new Date().toISOString(), club: manifest.club, team: manifest.team, season: manifest.season,
    competitions: manifest.teams.map(t => ({ competition: t.competition, players: count(t, "player"), officials: count(t, "official") })),
    photos_verified: manifest.photos.length, records_with_photos: actual.filter(r => r.photo_path).length, all_fields_match: true,
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --import or --verify.");
}
