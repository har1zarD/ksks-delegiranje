import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Bugojno";
const read = name => JSON.parse(readFileSync(`${dir}${name}.json`, "utf8"));
const save = (name, value) => writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2) + "\n");
const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
const mode = process.argv[2];

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  const clubs = read("clubs");
  const competitions = read("competitions").filter(c => c.name === "A1 liga žene" && c.category === "seniorke" && c.season.is_current && c.season.name === "2026/27");
  if (clubs.length !== 1 || clubs[0].name !== "KK Bugojno" || competitions.length !== 1) throw new Error("Club or competition mismatch.");
  const club_id = clubs[0].id, competition_id = competitions[0].id;
  if (read("licenses-before").some(r => r.competition_id === competition_id)) throw new Error("Existing licenses require reconciliation.");
  const players = [
    ["Asja", "Hasanbegović", "2003-06-15", 169, "PLAY"],
    ["Ilhana", "Hadžić", "2008-06-13", 187, "CENTAR"],
    ["Belma", "Arnautović", "2013-10-11", 167, "BEK"],
    ["Ilma", "Gulamić", "2010-05-23", 177, "KRILO"],
    ["Lena", "Zeljko", "2010-04-07", 179, "KRILO"],
    ["Monika", "Šafradin", "2010-08-08", 181, "KRILO"],
    ["Nejla", "Mujčić", "2007-02-26", 185, "CENTAR"],
    ["Nikol", "Peša", "2009-07-20", 183, "BEK"],
    ["Naida", "Rejan", "2009-05-27", 165, "BEK"],
    ["Tajra", "Jašarević", "2010-08-08", 167, "BEK"],
    ["Lejla", "Mešan", "2012-12-24", 187, "CENTAR"],
    ["Marija", "Bojanić", "2010-06-28", 171, "BEK"],
    ["Rahela", "Porča", "2008-12-06", 181, "CENTAR"],
    ["Amra", "Hurić", "1990-04-22", 171, "PLAY"],
    ["Sajra", "Baručija", "2011-04-09", 165, "PLAY"],
    ["Sarah", "Mešinović", "2009-07-16", 174, "PLAY"],
    ["Ajla", "Čatić", "2013-04-25", 165, "BEK"],
    ["Amelisa", "Karagić", "2014-11-17", 171, "BEK"],
    ["Amina", "Ajkić", "2010-06-10", 181, "KRILO"],
    ["Sajra", "Hakanović", "2006-02-28", 167, "PLAY"],
    ["Lejla", "Sadiković", "2013-08-26", 163, "PLAY"],
  ];
  const officials = [
    ["Zaim", "Zajmović", "Trener"],
    ["Izet", "Kelić", "Trener"],
    ["Miro", "Dražić", "Trener"],
    ["Mersed", "Mešan", "Ljekar"],
    ["Enes", "Trapo", "Fizioterapeut"],
    ["Mirza", "Ćatić", "Službeno lice"],
    ["Dragan", "Mučibabić", "Službeno lice"],
    ["Adila", "Ganić", "Službeno lice"],
    ["Mersed", "Mešan", "Službeno lice"],
  ];
  const normalize = text => text.normalize("NFC").toLocaleLowerCase("bs");
  const files = readdirSync(sourceDir).filter(f => /\.jpg$/i.test(f));
  const duplicates = files.filter(f => f.includes(" (1)"));
  for (const file of duplicates) {
    const original = files.find(f => normalize(f) === normalize(file.replace(" (1)", "")));
    if (!original || hash(`${sourceDir}/${original}`) !== hash(`${sourceDir}/${file}`)) throw new Error("Duplicate files differ.");
  }
  const photos = [], bySource = new Map();
  const missing = new Set(["Tajra Jašarević", "Ajla Čatić", "Amelisa Karagić", "Enes Trapo"]);
  const photoFor = (first, last) => {
    const fullName = `${first} ${last}`;
    const photoName = first === "Naida" ? "NAIDA.jpg" : `${fullName}.jpg`;
    const matches = files.filter(f => normalize(f) === normalize(photoName));
    if (matches.length === 0 && missing.has(fullName)) return null;
    if (matches.length !== 1) throw new Error(`Photo mismatch: ${fullName}`);
    const original = `${sourceDir}/${matches[0]}`;
    if (bySource.has(original)) return bySource.get(original).path;
    const compressed = fullName === "Sajra Baručija";
    const source = compressed ? `${dir}sajra-barucija.webp` : original;
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${fullName}`);
    const photo = {
      index: photos.length + 1, person: fullName, original, source,
      original_sha256: hash(original), sha256: hash(source), size: bytes.length,
      content_type: compressed ? "image/webp" : "image/jpeg",
      path: `${club_id}/bugojno-2026-27-${randomUUID()}.${compressed ? "webp" : "jpg"}`,
    };
    photos.push(photo);
    bySource.set(original, photo);
    return photo.path;
  };
  const positions = { PLAY: "PG", BEK: "SG", KRILO: "SF", CENTAR: "C" };
  const records = [
    ...players.map(([first_name, last_name, birth_date, height_cm, position], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place: null, height_cm,
      position: positions[position], license_no: null,
      photo_path: photoFor(first_name, last_name), sort: i + 1,
    })),
    ...officials.map(([first_name, last_name, role], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role,
      first_name, last_name, birth_date: null, birth_place: null,
      height_cm: null, position: null, license_no: null,
      photo_path: photoFor(first_name, last_name), sort: i + 1,
    })),
  ];
  if (records.length !== 30 || photos.length !== 25 || records.filter(r => !r.photo_path).length !== 4) throw new Error("Unexpected roster or photograph counts.");
  const unmapped = files.filter(f => !duplicates.includes(f) && f !== "Ljekarski 2627.jpg" && !bySource.has(`${sourceDir}/${f}`));
  if (unmapped.length) throw new Error(`Unmapped photos: ${unmapped.join(", ")}`);
  save("licenses-insert", records);
  save("folder-insert", [{ competition_id, club_id }]);
  save("roster-transcribed", { players, officials, positions });
  save("manifest", {
    status: "prepared", club: clubs[0].name, competition: competitions[0].name,
    season: "2026/27", club_id, competition_id,
    source: `${sourceDir}/Lista KSK SARAJEVO.pdf`, photos, missing_photos: [...missing],
    notes: [
      "Birth places and license numbers were not provided. Bugojno is the registration club, not the birth place.",
      "Positions normalized: PLAY → PG, BEK → SG, KRILO → SF, CENTAR → C.",
      "Mersed Mešan has two separate official licenses (doctor and representative), sharing one photo.",
      "Identical duplicate photographs of Ilma Gulamić and Sajra Baručija excluded.",
      "NAIDA.jpg mapped to Naida Rejan, the only Naida on the roster.",
      "Naida's photo is labeled REJHAN; surname Rejan retained exactly as printed in the PDF.",
      "Sajra Baručija photo converted to 1200×1600 WebP to meet the 5 MiB storage limit.",
      "Ljekarski 2627.jpg is a supporting document, not a portrait; not uploaded to license photos.",
    ],
  });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new Error("Missing connection configuration.");
  const config = (name, requests) => writeFileSync(`/private/tmp/ksks-bugojno-${name}.conf`, requests.map(r => [
    `url = ${JSON.stringify(`${base}/${r.path}`)}`,
    `header = ${JSON.stringify(`apikey: ${key}`)}`,
    `header = ${JSON.stringify(`Authorization: Bearer ${key}`)}`,
    ...(r.method ? [
      `request = "${r.method}"`, `header = "Content-Type: ${r.type ?? "application/json"}"`,
      `header = "Prefer: ${r.prefer ?? "return=representation"}"`,
      `data-binary = ${JSON.stringify(`@${r.file}`)}`,
    ] : []),
    `output = ${JSON.stringify(`${dir}${r.output}`)}`,
    `write-out = ${JSON.stringify(`${r.output}: %{http_code}\n`)}`,
  ].join("\n")).join("\nnext\n") + "\n", { mode: 0o600 });
  config("folder", [{ path: "rest/v1/license_folders?on_conflict=competition_id,club_id", method: "POST", prefer: "resolution=ignore-duplicates,return=representation", file: `${dir}folder-insert.json`, output: "folder-insert-result.json" }]);
  config("insert", [{ path: "rest/v1/licenses", method: "POST", file: `${dir}licenses-insert.json`, output: "licenses-insert-result.json" }]);
  config("upload", photos.map(p => ({ path: `storage/v1/object/licenses/${p.path}`, method: "POST", type: p.content_type, file: p.source, output: `upload-${p.index}.json` })));
  mkdirSync(`${dir}downloaded`, { recursive: true });
  config("download", photos.map(p => ({ path: `storage/v1/object/authenticated/licenses/${p.path}`, output: `downloaded/${p.index}.${p.content_type === "image/webp" ? "webp" : "jpg"}` })));
  config("after", [
    { path: `rest/v1/licenses?select=*&club_id=eq.${club_id}&order=kind,sort`, output: "licenses-after.json" },
    { path: `rest/v1/license_folders?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}`, output: "folder-after.json" },
  ]);
  console.log(JSON.stringify({ players: 21, official_licenses: 9, unique_photos: photos.length, missing_photos: [...missing] }));
} else if (mode === "--check-uploads") {
  for (const p of read("manifest").photos) {
    if (read(`upload-${p.index}`).Key !== `licenses/${p.path}`) throw new Error(`Upload failed: ${p.person}`);
  }
  console.log("All 25 uploads confirmed.");
} else if (mode === "--verify") {
  const manifest = read("manifest"), expected = read("licenses-insert"), actual = read("licenses-after");
  const own = actual.filter(r => r.competition_id === manifest.competition_id);
  if (own.length !== expected.length) throw new Error("Record count mismatch.");
  for (const r of [...expected, ...read("licenses-before")]) {
    const stored = actual.find(a => a.id === r.id);
    if (!stored || Object.keys(r).some(k => stored[k] !== r[k])) throw new Error(`Record mismatch: ${r.first_name} ${r.last_name}`);
  }
  const folders = read("folder-after");
  if (folders.length !== 1 || folders[0].club_id !== manifest.club_id || folders[0].competition_id !== manifest.competition_id) throw new Error("Folder missing.");
  for (const p of manifest.photos) {
    const file = `${dir}downloaded/${p.index}.${p.content_type === "image/webp" ? "webp" : "jpg"}`;
    if (hash(file) !== p.sha256) throw new Error(`Stored photo differs: ${p.person}`);
  }
  const result = {
    verified_at: new Date().toISOString(), club: manifest.club,
    competition: manifest.competition, season: manifest.season,
    players: 21, official_licenses: 9, unique_photos_verified: 25,
    records_with_photos: own.filter(r => r.photo_path).length,
    missing_photos: manifest.missing_photos, all_fields_match: true,
    tests_run: false, build_run: false,
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --check-uploads or --verify.");
}
