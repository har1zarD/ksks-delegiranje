import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Mladost";
const read = name => JSON.parse(readFileSync(`${dir}${name}.json`, "utf8"));
const save = (name, value) => writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2) + "\n");
const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
const mode = process.argv[2];

const club_id = "923b4c9f-85ec-473d-a927-a8fd541351a7";
const competition_id = "ad3e34d0-8393-46ec-a464-e0db6a898cb9";
const ext = { "image/jpeg": "jpg", "image/png": "png" };

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  if (read("licenses-before").length) throw new Error("Existing licenses require reconciliation.");
  const players = [
    ["Imran", "Osmanagić", "2012-02-21"],
    ["Said", "Ganić", "2012-09-13"],
    ["Ahmed", "Suša", "2012-03-19"],
    ["Nur", "Šerak", "2012-01-30"],
    ["Emir", "Fazlić", "2012-08-19"],
    ["Harun", "Dervišević", "2012-01-26"],
    ["Adi", "Sjerotanović", "2012-04-28"],
    ["Šemso", "Lemeš", "2012-08-23"],
    ["Amar", "Kahvedžić", "2013-08-06"],
    ["Jusuf", "Begzadić", "2013-02-26"],
    ["Ahmed", "Frljak", "2013-02-08"],
    ["Din", "Bulbulušić", "2014-08-28"],
    ["Evelin", "Botić", "2013-03-29"],
    ["Emsudin", "Alić", "2013-01-22"],
    ["Sanjin", "Čavrk", "2013-05-26"],
  ].map(([first, last, birth]) => [first, last, birth, "Sarajevo"]);
  const officials = [
    ["Eldin", "Herco", "Trener", "1989-04-10", "Sarajevo", "ELDIN HERCO.jpg"],
    ["Hajrudin", "Vatreš", "Trener", "1992-01-15", "Rogatica", "HAJRUDIN VATREŠ.jpg"],
    ["Benjamin", "Velić", "Trener", "1999-09-08", "Sarajevo", "BENJAMIN VELIĆ.jpg"],
    ["Ivan", "Matičević", "Trener", "1998-09-08", "Sarajevo", "IVAN MATIČEVIĆ.jpg"],
    ["Iris", "Abdukić", "Trener", "1975-07-29", "Sarajevo", "IRIS ABDUKUIĆ.jpg"],
    ["Ibrahim", "Jašarević", "Trener", "1975-05-19", "Sarajevo", "IBRAHIM JAŠAREVIĆ.jpg"],
    ["Ibrahim", "Jašarević", "Službeno lice", "1975-05-19", "Sarajevo", "IBRAHIM JAŠAREVIĆ - sl.predstavnik.jpg"],
  ];
  const normalize = text => text.normalize("NFC").toLocaleLowerCase("bs");
  // Igrači: "1.IMRAN OSMANAGIĆ.jpg", "8. ŠEMSO LEMEŠ (2).jpg"; pasoši (PAS.) su dokumenti, ne fotografije
  const playerFiles = readdirSync(`${sourceDir}/pioniri`).filter(f => /\.jpe?g$/i.test(f) && !/PAS\.\./.test(f));
  const documents = readdirSync(`${sourceDir}/pioniri`).filter(f => /PAS\.\./.test(f));
  const photos = [];
  const addPhoto = (person, source) => {
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${person}`);
    const photo = {
      index: photos.length + 1, person, source,
      sha256: hash(source), size: bytes.length, content_type: "image/jpeg",
      path: `${club_id}/mladost-pioniri-2026-27-${randomUUID()}.jpg`,
    };
    photos.push(photo);
    return photo.path;
  };
  const playerPhoto = (first, last) => {
    const name = normalize(`${first} ${last}`);
    const matches = playerFiles.filter(f => normalize(f.replace(/\.jpe?g$/i, "").replace(/^\d+\.\s*/, "").replace(/\s*\(\d+\)$/, "")) === name);
    if (matches.length !== 1) throw new Error(`Photo mismatch: ${first} ${last}`);
    return addPhoto(`${first} ${last}`, `${sourceDir}/pioniri/${matches[0]}`);
  };
  const records = [
    ...players.map(([first_name, last_name, birth_date, birth_place], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place, height_cm: null,
      position: null, license_no: null,
      photo_path: playerPhoto(first_name, last_name), sort: i + 1,
    })),
    ...officials.map(([first_name, last_name, role, birth_date, birth_place, file], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role,
      first_name, last_name, birth_date, birth_place,
      height_cm: null, position: null, license_no: null,
      photo_path: addPhoto(`${first_name} ${last_name} (${role})`, `${sourceDir}/treneri/${file}`), sort: i + 1,
    })),
  ];
  if (records.length !== 22 || photos.length !== 22 || documents.length !== 2) throw new Error("Unexpected roster or photograph counts.");
  const unmapped = [
    ...playerFiles.filter(f => !photos.some(p => p.source === `${sourceDir}/pioniri/${f}`)),
    ...readdirSync(`${sourceDir}/treneri`).filter(f => !photos.some(p => p.source === `${sourceDir}/treneri/${f}`)),
  ];
  if (unmapped.length) throw new Error(`Unmapped photos: ${unmapped.join(", ")}`);
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK Mladost (Ilijaš)", competition: "Pioniri — Grupa 1",
    season: "2026/27", club_id, competition_id,
    source: `${sourceDir}/pioniri/PIONIRI MLADOST - LISTA ZA Licenciranje takmičarska sezona 2025-2026.doc`, photos,
    notes: [
      "Roster header says season 2026/2027 (file name says 2025-2026).",
      "Height, position and license numbers not provided for youth players.",
      "Officials' birth dates and places taken from the roster.",
      "Iris Abdukić spelled as in the roster (photo file: ABDUKUIĆ).",
      "Ibrahim Jašarević: Trener (roster) and Službeno lice (separate photo labelled sl.predstavnik in the email).",
      `Passport scans not uploaded as portraits: ${documents.join(", ")}.`,
      "Youth folder comes from the club's team in Pioniri — Grupa 1; no license_folders row needed.",
    ],
  });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new Error("Missing connection configuration.");
  const config = (name, requests) => writeFileSync(`/private/tmp/ksks-mladost-${name}.conf`, requests.map(r => [
    `url = ${JSON.stringify(`${base}/${r.path}`)}`,
    `header = ${JSON.stringify(`apikey: ${key}`)}`,
    `header = ${JSON.stringify(`Authorization: Bearer ${key}`)}`,
    ...(r.method ? [
      `request = "${r.method}"`, `header = "Content-Type: ${r.type ?? "application/json"}"`,
      `header = "Prefer: return=representation"`,
      `data-binary = ${JSON.stringify(`@${r.file}`)}`,
    ] : []),
    `output = ${JSON.stringify(`${dir}${r.output}`)}`,
    `write-out = ${JSON.stringify(`${r.output}: %{http_code}\n`)}`,
  ].join("\n")).join("\nnext\n") + "\n", { mode: 0o600 });
  config("insert", [{ path: "rest/v1/licenses", method: "POST", file: `${dir}licenses-insert.json`, output: "licenses-insert-result.json" }]);
  config("upload", photos.map(p => ({ path: `storage/v1/object/licenses/${p.path}`, method: "POST", type: p.content_type, file: p.source, output: `upload-${p.index}.json` })));
  mkdirSync(`${dir}downloaded`, { recursive: true });
  config("download", photos.map(p => ({ path: `storage/v1/object/authenticated/licenses/${p.path}`, output: `downloaded/${p.index}.${ext[p.content_type]}` })));
  config("after", [{ path: `rest/v1/licenses?select=*&club_id=eq.${club_id}&order=kind,sort`, output: "licenses-after.json" }]);
  console.log(JSON.stringify({ players: players.length, officials: officials.length, photos: photos.length, documents }));
} else if (mode === "--check-uploads") {
  for (const p of read("manifest").photos) {
    if (read(`upload-${p.index}`).Key !== `licenses/${p.path}`) throw new Error(`Upload failed: ${p.person}`);
  }
  console.log(`All ${read("manifest").photos.length} uploads confirmed.`);
} else if (mode === "--verify") {
  const manifest = read("manifest"), expected = read("licenses-insert"), actual = read("licenses-after");
  if (actual.length !== expected.length) throw new Error("Record count mismatch.");
  for (const r of expected) {
    const stored = actual.find(a => a.id === r.id);
    if (!stored || Object.keys(r).some(k => stored[k] !== r[k])) throw new Error(`Record mismatch: ${r.first_name} ${r.last_name}`);
  }
  for (const p of manifest.photos) {
    if (hash(`${dir}downloaded/${p.index}.${ext[p.content_type]}`) !== p.sha256) throw new Error(`Stored photo differs: ${p.person}`);
  }
  const result = {
    verified_at: new Date().toISOString(), club: manifest.club,
    competition: manifest.competition, season: manifest.season,
    players: 15, official_licenses: 7, photos_verified: manifest.photos.length, all_fields_match: true,
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --check-uploads or --verify.");
}
