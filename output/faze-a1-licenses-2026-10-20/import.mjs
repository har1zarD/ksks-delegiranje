import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const read = name => JSON.parse(readFileSync(`${dir}${name}.json`, "utf8"));
const save = (name, value) => writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2) + "\n");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const mode = process.argv[2];
if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared; retain existing IDs.");
  const clubs = read("clubs-before").filter(c => c.name === "ŽKK Faze" && c.active);
  const competitions = read("competitions-before").filter(c => c.name === "A1 liga žene" && c.category === "seniorke" && c.gender === "Ž" && c.season.name === "2026/27" && c.season.is_current);
  if (clubs.length !== 1 || competitions.length !== 1) throw new Error("Club or competition is ambiguous.");
  const club_id = clubs[0].id;
  const competition_id = competitions[0].id;
  if (read("licenses-before").some(r => r.competition_id === competition_id)) throw new Error("Existing licenses need reconciliation.");
  const sourceDir = "/Users/tarikvelic/Downloads/KK Faze";
  const files = readdirSync(sourceDir).filter(f => /\.jpe?g$/i.test(f));
  const normalize = s => s.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tables = read("source-tables");
  const records = [];
  for (const cells of tables[0].slice(2)) {
    const [order, last_name, first_name, date, birth_place, height, position, number] = cells;
    if (!last_name || last_name === "---") continue;
    const [day, month, year] = date.split(".");
    const birth_date = `${year}-${month}-${day}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth_date) || new Date(birth_date).toISOString().slice(0, 10) !== birth_date) throw new Error(`Invalid date: ${date}`);
    records.push({ kind: "player", role: null, last_name, first_name, birth_date, birth_place, height_cm: Number(height), position, license_no: number || null, sort: Number(order) });
  }
  const roles = { TRENER: "Trener", LJEKAR: "Ljekar", "SLUŽBENO LICE": "Službeno lice" };
  for (const cells of tables[1].slice(1)) {
    const [order, role, last_name, first, number] = cells;
    if (!last_name || !first) continue;
    if (!roles[role]) throw new Error(`Unknown role: ${role}`);
    records.push({ kind: "official", role: roles[role], last_name, first_name: first.replace(/^dr\.\s*/i, ""), birth_date: null, birth_place: null, height_cm: null, position: null, license_no: number || null, sort: Number(order) });
  }
  const photos = [];
  for (const [index, row] of records.entries()) {
    const first = row.first_name === "Tayra" ? "Tajra" : row.first_name;
    const candidates = files.filter(file => {
      const tokens = normalize(file.replace(/\.jpe?g$/i, "")).split(/[\s_]+/);
      return tokens.includes(normalize(first)) && tokens.includes(normalize(row.last_name));
    });
    if (candidates.length !== 1) throw new Error(`Ambiguous photograph: ${row.first_name} ${row.last_name}`);
    const source = `${sourceDir}/${candidates[0]}`;
    const bytes = readFileSync(source);
    if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.length > 5242880) throw new Error(`Unsupported photograph: ${source}`);
    row.id = randomUUID();
    row.club_id = club_id;
    row.competition_id = competition_id;
    row.photo_path = `${club_id}/faze-2026-27-${row.id}.jpg`;
    photos.push({ index: index + 1, name: `${row.first_name} ${row.last_name}`, source, path: row.photo_path, sha256: hash(bytes), size: bytes.length });
  }
  if (records.filter(r => r.kind === "player").length !== 14 || records.filter(r => r.kind === "official").length !== 4 || files.length !== 18 || new Set(photos.map(p => p.source)).size !== 18) throw new Error("Roster/photo count mismatch.");
  save("licenses-insert", records);
  save("folder-insert", [{ club_id, competition_id }]);
  const manifest = {
    status: "prepared", club: clubs[0].name, competition: competitions[0].name, season: "2026/27", club_id, competition_id,
    source: "/Users/tarikvelic/Downloads/spisak za licenciranje  2026-2027_A1_kk FaZe (2).docx",
    photos,
    notes: [
      "Sara Jašić birth date is 2011-09-30 per DOCX; photo filename contains 2012.",
      "Tayra Kočo spelling retained from DOCX; photo filename says Tajra.",
      "Doctor title dr. omitted from first_name; Edin Buljugić has role Ljekar.",
      "Positions retained verbatim from DOCX, including Plajmejker.",
      "All 18 license numbers are blank in source and remain null.",
      "Official birth details are not supplied and remain null.",
      "Original photographs are stored without edits in the private licenses bucket.",
    ],
  };
  save("manifest", manifest);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new Error("Missing configuration.");
  const config = (name, requests) => writeFileSync(`/private/tmp/ksks-faze-${name}.conf`, requests.map(r => [
    `url = ${JSON.stringify(`${base}/${r.path}`)}`,
    `header = ${JSON.stringify(`apikey: ${key}`)}`,
    `header = ${JSON.stringify(`Authorization: Bearer ${key}`)}`,
    ...(r.method ? [`request = "${r.method}"`, `header = ${JSON.stringify(`Content-Type: ${r.type ?? "application/json"}`)}`, 'header = "Prefer: return=representation"', `data-binary = ${JSON.stringify(`@${r.file}`)}`] : []),
    `output = ${JSON.stringify(`${dir}${r.output}`)}`,
    `write-out = ${JSON.stringify(`${r.output}: %{http_code}\n`)}`,
  ].join("\n")).join("\nnext\n") + "\n", { mode: 0o600 });
  if (!read("folders-before").some(f => f.competition_id === competition_id)) {
    config("folder", [{ path: "rest/v1/license_folders", method: "POST", file: `${dir}folder-insert.json`, output: "folder-insert-result.json" }]);
  }
  config("licenses", [{ path: "rest/v1/licenses", method: "POST", file: `${dir}licenses-insert.json`, output: "licenses-insert-result.json" }]);
  config("upload", photos.map(p => ({ path: `storage/v1/object/licenses/${p.path}`, method: "POST", type: "image/jpeg", file: p.source, output: `upload-${p.index}.json` })));
  mkdirSync(`${dir}downloaded`, { recursive: true });
  config("download", photos.map(p => ({ path: `storage/v1/object/authenticated/licenses/${p.path}`, output: `downloaded/${p.index}.jpg` })));
  config("after", [
    { path: `rest/v1/licenses?select=*&club_id=eq.${club_id}&order=kind,sort`, output: "licenses-after.json" },
    { path: `rest/v1/license_folders?select=*&club_id=eq.${club_id}`, output: "folders-after.json" },
  ]);
  console.log(JSON.stringify({ club: manifest.club, competition: manifest.competition, players: 14, officials: 4, photos: photos.length }));
} else if (mode === "--check-uploads") {
  for (const p of read("manifest").photos) {
    if (read(`upload-${p.index}`).Key !== `licenses/${p.path}`) throw new Error(`Upload not confirmed: ${p.index}`);
  }
  console.log("All 18 uploads confirmed.");
} else if (mode === "--verify") {
  const manifest = read("manifest");
  const expected = read("licenses-insert");
  const after = read("licenses-after");
  const own = after.filter(r => r.competition_id === manifest.competition_id);
  if (own.length !== 18) throw new Error("Stored roster count mismatch.");
  for (const row of expected) {
    const actual = own.find(r => r.id === row.id);
    if (!actual || Object.keys(row).some(k => actual[k] !== row[k])) throw new Error(`Stored fields mismatch: ${row.first_name} ${row.last_name}`);
  }
  for (const old of read("licenses-before")) {
    const actual = after.find(r => r.id === old.id);
    if (!actual || Object.keys(old).some(k => actual[k] !== old[k])) throw new Error("Existing license changed.");
  }
  const folders = read("folders-after");
  if (folders.filter(f => f.competition_id === manifest.competition_id && f.club_id === manifest.club_id).length !== 1) throw new Error("License folder not confirmed.");
  for (const old of read("folders-before")) {
    const actual = folders.find(f => f.competition_id === old.competition_id && f.club_id === old.club_id);
    if (!actual || Object.keys(old).some(k => actual[k] !== old[k])) throw new Error("Existing folder changed.");
  }
  for (const photo of manifest.photos) {
    if (hash(readFileSync(`${dir}downloaded/${photo.index}.jpg`)) !== photo.sha256) throw new Error(`Stored photograph differs: ${photo.name}`);
  }
  const result = { verified_at: new Date().toISOString(), club: manifest.club, competition: manifest.competition, season: manifest.season, players: 14, officials: 4, photos_verified_by_sha256: 18, all_fields_match: true, license_numbers_not_provided: 18, existing_records_preserved: true, tests_run: false, build_run: false };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --check-uploads or --verify.");
}
