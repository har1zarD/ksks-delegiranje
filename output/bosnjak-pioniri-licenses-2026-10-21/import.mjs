import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/PIONIRI'";
const read = name => JSON.parse(readFileSync(`${dir}${name}.json`, "utf8"));
const save = (name, value) => writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2) + "\n");
const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
const mode = process.argv[2];

const club_id = "1804b244-b0d8-4294-9a74-b0a53731e4c0";
const competition_id = "ad3e34d0-8393-46ec-a464-e0db6a898cb9";
const ext = { "image/jpeg": "jpg", "image/png": "png" };

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  if (read("licenses-before").length) throw new Error("Existing licenses require reconciliation.");
  const players = [
    ["Amar", "Drina", "2013-02-14"],
    ["Nidal", "Proha", "2014-05-24"],
    ["Afan", "Proha", "2013-12-06"],
    ["Vedad", "Hasanović", "2014-04-30"],
    ["Safet", "Mujan", "2013-12-16"],
    ["Tarik", "Gačanović", "2013-09-26"],
    ["Tarik", "Balić", "2013-03-07"],
    ["Adnan", "Ismić", "2012-11-05"],
    ["Amar", "Hasanović", "2013-07-19"],
    ["Muharem", "Sidran", "2012-08-01"],
    ["Kerim", "Korić", "2012-03-20"],
    ["Ibrahim", "Kazić", "2012-01-11"],
    ["Samin", "Hodžić", "2012-04-03"],
    ["Amar", "Đelko", "2013-12-22"],
    ["Ajnur", "Bećirović", "2012-05-20"],
    ["Amir", "Mujić", "2014-07-11"],
    ["Ahmed", "Ramić", "2014-02-10"],
    ["Ahmed", "Dupovac", "2012-08-08"],
    ["Afan", "Đelilović", "2012-04-19"],
    ["Ajnur", "Čović", "2012-01-25"],
  ];
  const officials = [
    ["Adis", "Drina", "1992-02-27", "Sarajevo"],
    ["Eldin", "Đelilović", "2003-09-22", "Sarajevo"],
    ["Edin", "Rešidović", "1994-08-17", "Suhodol"],
    ["Alen", "Bašić", "1983-08-26", "Mokrine"],
  ];
  const normalize = text => text.normalize("NFC").toLocaleLowerCase("bs");
  const files = readdirSync(sourceDir).filter(f => /\.jpe?g$/i.test(f));
  // Fajl slike piše "Dželilović", lista "Đelilović"
  const fileName = { "Afan Đelilović": "Afan Dželilović.jpg" };
  const missing = new Set(["Tarik Balić"]);
  const photos = [];
  const playerPhoto = (first, last) => {
    const person = `${first} ${last}`;
    const want = normalize(fileName[person] ?? `${person}.jpg`);
    const matches = files.filter(f => normalize(f) === want);
    if (matches.length === 0 && missing.has(person)) return null;
    if (matches.length !== 1) throw new Error(`Photo mismatch: ${person}`);
    const source = `${sourceDir}/${matches[0]}`;
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${person}`);
    const photo = {
      index: photos.length + 1, person, source,
      sha256: hash(source), size: bytes.length, content_type: "image/jpeg",
      path: `${club_id}/bosnjak-pioniri-2026-27-${randomUUID()}.jpg`,
    };
    photos.push(photo);
    return photo.path;
  };
  const records = [
    ...players.map(([first_name, last_name, birth_date], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place: "Sarajevo", height_cm: null,
      position: null, license_no: null,
      photo_path: playerPhoto(first_name, last_name), sort: i + 1,
    })),
    // Lista ne navodi funkciju službenih osoba
    ...officials.map(([first_name, last_name, birth_date, birth_place], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role: "Službeno lice",
      first_name, last_name, birth_date, birth_place,
      height_cm: null, position: null, license_no: null,
      photo_path: null, sort: i + 1,
    })),
  ];
  if (records.length !== 24 || photos.length !== 19 || records.filter(r => !r.photo_path).length !== 5) throw new Error("Unexpected roster or photograph counts.");
  const unmapped = files.filter(f => !photos.some(p => p.source === `${sourceDir}/${f}`));
  if (unmapped.length) throw new Error(`Unmapped photos: ${unmapped.join(", ")}`);
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK Bošnjak (Hadžići)", competition: "Pioniri — Grupa 1",
    season: "2026/27", club_id, competition_id,
    source: ["/Users/tarikvelic/Downloads/LISTA ZA Licenciranje takmičarska sezona    2025-2026.pdf", "/Users/tarikvelic/Downloads/Spisak Pioniri.pdf"], photos,
    missing_photos: ["Tarik Balić", ...officials.map(o => `${o[0]} ${o[1]}`)],
    notes: [
      "Typed list and signed scan (Spisak Pioniri.pdf) match: 20 players, 4 officials.",
      "Officials listed without a function; stored as Službeno lice.",
      "Height, position and license numbers not provided.",
      "Photo file Afan Dželilović.jpg mapped to Afan Đelilović (spelling on the list).",
      "Tarik Balić and all officials have no photograph.",
    ],
  });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new Error("Missing connection configuration.");
  const config = (name, requests) => writeFileSync(`/private/tmp/ksks-bosnjak-${name}.conf`, requests.map(r => [
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
  console.log(JSON.stringify({ players: players.length, officials: officials.length, photos: photos.length, missing: [...missing] }));
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
    players: 20, official_licenses: 4, missing_photos: manifest.missing_photos, photos_verified: manifest.photos.length, all_fields_match: true,
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --check-uploads or --verify.");
}
