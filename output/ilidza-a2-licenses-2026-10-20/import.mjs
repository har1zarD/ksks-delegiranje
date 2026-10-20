import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Ilidza";
const read = name => JSON.parse(readFileSync(`${dir}${name}.json`, "utf8"));
const save = (name, value) => writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2) + "\n");
const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
const mode = process.argv[2];

const club_id = "370294d2-5ab0-4ac7-9ebb-fc1637027a82";
const competition_id = "d74bc0b4-99f1-4313-8c15-463f76d06764";
const ext = { "image/jpeg": "jpg", "image/png": "png" };

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  if (read("licenses-before").length) throw new Error("Existing licenses require reconciliation.");
  const players = [
    ["Ahmed", "Džubur", "2008-10-27", "Sarajevo", 190, "SG"],
    ["Bakir", "Kurić", "2008-10-09", "Sarajevo", 190, "PG"],
    ["Arslan", "Dobrača", "2008-06-06", "Sarajevo", 210, "C"],
    ["Kenan", "Alispahić", "2009-03-11", "Zenica", 197, "SF"],
    ["Aris", "Beglerbegović", "2008-08-11", "Sarajevo", 185, "SG"],
    ["Hamza", "Šutković", "2007-07-06", "Travnik", 200, "PF"],
    ["Faris", "Isaković", "2007-11-18", "Sarajevo", 195, "SF"],
    ["Sami Isa", "Hadžajlija", "2008-04-22", "Sarajevo", 192, "SG"],
    ["Isa", "Mujačić", "2008-01-23", "Sarajevo", 194, "SF"],
    ["Armin", "Hasanović", "2009-07-21", "Sarajevo", 201, "C"],
    ["Davud", "Prlja", "2009-07-20", "Sarajevo", 190, "SG"],
    ["Džabir", "Sikirić", "2006-05-29", "Sarajevo", 200, "PF"],
    ["Jasmin", "Agić", "2005-07-03", "Tuzla", 204, "PF"],
    ["Rizvan", "Topčić", "2007-02-13", "Travnik", 178, "PG"],
    ["Amar", "Curo", "2008-12-31", "Sarajevo", 180, "SG"],
    ["Rejhan", "Polimac", "2010-10-09", "Sarajevo", 175, "PG"],
    ["Džan", "Krupalija", "2011-05-31", "Sarajevo", 202, "PF"],
    ["Vedad", "Ćurović", "2009-12-08", "Sarajevo", 196, "PF"],
    ["Benjamin Isa", "Kordić", "2008-02-16", "Sarajevo", 180, "PG"],
  ];
  const officials = [
    ["Dino", "Kosovac", "Trener"],
    ["Mak", "Sakoč", "Trener"],
    ["Emir", "Uzunović", "Trener"],
    ["Enes", "Numanović", "Trener"],
    ["Admir", "Sakoč", "Službeno lice"],
  ];
  const missing = new Set(["Emir Uzunović"]);
  const normalize = text => text.normalize("NFC").toLocaleLowerCase("bs");
  const files = readdirSync(sourceDir).filter(f => /\.(jpe?g|png)$/i.test(f));
  const photos = [];
  const photoFor = (first, last) => {
    const fullName = `${first} ${last}`;
    const matches = files.filter(f => normalize(f.replace(/\.[^.]+$/, "")) === normalize(fullName));
    if (matches.length === 0 && missing.has(fullName)) return null;
    if (matches.length !== 1) throw new Error(`Photo mismatch: ${fullName}`);
    const source = `${sourceDir}/${matches[0]}`;
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${fullName}`);
    const content_type = /\.png$/i.test(source) ? "image/png" : "image/jpeg";
    const photo = {
      index: photos.length + 1, person: fullName, source,
      sha256: hash(source), size: bytes.length, content_type,
      path: `${club_id}/ilidza-2026-27-${randomUUID()}.${ext[content_type]}`,
    };
    photos.push(photo);
    return photo.path;
  };
  const records = [
    ...players.map(([first_name, last_name, birth_date, birth_place, height_cm, position], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place, height_cm,
      position, license_no: null,
      photo_path: photoFor(first_name, last_name), sort: i + 1,
    })),
    ...officials.map(([first_name, last_name, role], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role,
      first_name, last_name, birth_date: null, birth_place: null,
      height_cm: null, position: null, license_no: null,
      photo_path: photoFor(first_name, last_name), sort: i + 1,
    })),
  ];
  if (records.length !== 24 || photos.length !== 23 || records.filter(r => !r.photo_path).length !== 1) throw new Error("Unexpected roster or photograph counts.");
  const unmapped = files.filter(f => !photos.some(p => p.source === `${sourceDir}/${f}`));
  if (unmapped.length) throw new Error(`Unmapped photos: ${unmapped.join(", ")}`);
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK Ilidža", competition: "A2 liga jug KSBiH",
    season: "2026/27", club_id, competition_id,
    source: `${sourceDir}/spisak za licenciranje A2 JUG - 2026-2027.pdf`, photos, missing_photos: [...missing],
    notes: [
      "License numbers were not provided.",
      "Names and birth places converted from uppercase to title case; double first names (Sami Isa, Benjamin Isa) kept as printed.",
      "License folder for KK Ilidža in A2 liga jug already existed; not recreated.",
      "Emir Uzunović (Trener) has no photograph in the email.",
    ],
  });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new Error("Missing connection configuration.");
  const config = (name, requests) => writeFileSync(`/private/tmp/ksks-ilidza-${name}.conf`, requests.map(r => [
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
  console.log(JSON.stringify({ players: players.length, officials: officials.length, photos: photos.length, missing_photos: [...missing] }));
} else if (mode === "--check-uploads") {
  for (const p of read("manifest").photos) {
    if (read(`upload-${p.index}`).Key !== `licenses/${p.path}`) throw new Error(`Upload failed: ${p.person}`);
  }
  console.log("All 23 uploads confirmed.");
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
    players: 19, officials: 5, photos_verified: manifest.photos.length,
    missing_photos: manifest.missing_photos, all_fields_match: true,
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --check-uploads or --verify.");
}
