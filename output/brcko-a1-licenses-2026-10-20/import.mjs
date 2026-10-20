import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const read = name => JSON.parse(readFileSync(`${dir}${name}.json`, "utf8"));
const save = (name, data) => writeFileSync(`${dir}${name}.json`, JSON.stringify(data, null, 2) + "\n");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const manifest = read("manifest");
const mode = process.argv[2];

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared; retain its IDs.");
  const competitions = read("competitions").filter(c => c.name === manifest.competition && c.season.name === manifest.season && c.season.is_current);
  if (competitions.length !== 1 || competitions[0].category !== "seniorke") throw new Error("Competition mismatch.");
  const competition_id = competitions[0].id;
  const clubs = read("clubs-all");
  const normalize = text => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (clubs.some(c => normalize(`${c.name} ${c.short_name}`).includes("brcko"))) throw new Error("Existing club requires reconciliation.");
  const club_id = randomUUID();
  const records = read("licenses-prepared").map(row => {
    const id = randomUUID();
    const photo = row.kind === "player" ? manifest.photos.find(p => p.sort === row.sort && p.first_name === row.first_name && p.last_name === row.last_name) : null;
    if (row.kind === "player" && !photo) throw new Error("Missing photo mapping.");
    if (photo) {
      if (hash(readFileSync(photo.source)) !== photo.sha256) throw new Error("Source photo changed.");
      photo.path = `${club_id}/brcko-2026-27-${id}.${photo.content_type === "image/png" ? "png" : "jpg"}`;
    }
    return { id, competition_id, club_id, ...row, photo_path: photo?.path ?? null };
  });
  if (records.length !== 17 || manifest.photos.length !== 15) throw new Error("Unexpected roster count.");
  save("club-insert", [{ id: club_id, name: "KK Brčko Distrikt", short_name: "Brčko Distrikt", city: "Brčko", active: true, youth: false }]);
  save("folder-insert", [{ competition_id, club_id }]);
  save("licenses-insert", records);
  manifest.club_id = club_id;
  manifest.competition_id = competition_id;
  save("manifest", manifest);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new Error("Missing connection configuration.");
  const config = (name, requests) => writeFileSync(`/private/tmp/ksks-brcko-${name}.conf`, requests.map(r => [
    `url = ${JSON.stringify(`${base}/${r.path}`)}`,
    `header = ${JSON.stringify(`apikey: ${key}`)}`,
    `header = ${JSON.stringify(`Authorization: Bearer ${key}`)}`,
    ...(r.method ? [
      `request = "${r.method}"`,
      `header = ${JSON.stringify(`Content-Type: ${r.type ?? "application/json"}`)}`,
      'header = "Prefer: return=representation"',
      `data-binary = ${JSON.stringify(`@${r.file}`)}`,
    ] : []),
    `output = ${JSON.stringify(`${dir}${r.output}`)}`,
    `write-out = ${JSON.stringify(`${r.output}: %{http_code}\n`)}`,
  ].join("\n")).join("\nnext\n") + "\n", { mode: 0o600 });
  for (const [name, table] of [["club", "clubs"], ["folder", "license_folders"], ["licenses", "licenses"]]) {
    config(name, [{ path: `rest/v1/${table}`, method: "POST", file: `${dir}${name}-insert.json`, output: `${name}-insert-result.json` }]);
  }
  config("upload", manifest.photos.map(p => ({
    path: `storage/v1/object/licenses/${p.path}`, method: "POST",
    type: p.content_type, file: p.source, output: `upload-${p.sort}.json`,
  })));
  mkdirSync(`${dir}downloaded`, { recursive: true });
  config("download", manifest.photos.map(p => ({
    path: `storage/v1/object/authenticated/licenses/${p.path}`, output: `downloaded/${p.sort}.${p.content_type === "image/png" ? "png" : "jpg"}`,
  })));
  config("after", [
    { path: `rest/v1/clubs?select=*&id=eq.${club_id}`, output: "club-after.json" },
    { path: `rest/v1/license_folders?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}`, output: "folder-after.json" },
    { path: `rest/v1/licenses?select=*&competition_id=eq.${competition_id}&order=kind,sort`, output: "licenses-after.json" },
  ]);
  console.log(JSON.stringify({ club: "KK Brčko Distrikt", competition: manifest.competition, records: records.length, photos: manifest.photos.length }));
} else if (mode === "--check-uploads") {
  for (const photo of manifest.photos) {
    const result = read(`upload-${photo.sort}`);
    if (result.Key !== `licenses/${photo.path}`) throw new Error(`Upload not confirmed: ${photo.sort}`);
  }
  console.log("All 15 uploads confirmed.");
} else if (mode === "--verify") {
  const actual = read("licenses-after");
  const expected = read("licenses-insert");
  const own = actual.filter(r => r.club_id === manifest.club_id);
  if (own.length !== 17) throw new Error("Stored roster count mismatch.");
  for (const row of expected) {
    const stored = own.find(r => r.id === row.id);
    if (!stored || Object.keys(row).some(k => stored[k] !== row[k])) throw new Error(`Stored fields mismatch: ${row.first_name} ${row.last_name}`);
  }
  for (const row of read("licenses-before")) {
    const stored = actual.find(r => r.id === row.id);
    if (!stored || Object.keys(row).some(k => JSON.stringify(stored[k]) !== JSON.stringify(row[k]))) throw new Error("Pre-existing license changed.");
  }
  const club = read("club-after");
  const expectedClub = read("club-insert")[0];
  if (club.length !== 1 || Object.keys(expectedClub).some(k => club[0][k] !== expectedClub[k])) throw new Error("Club mismatch.");
  const folder = read("folder-after");
  if (folder.length !== 1 || folder[0].club_id !== manifest.club_id || folder[0].competition_id !== manifest.competition_id) throw new Error("Folder mismatch.");
  for (const photo of manifest.photos) {
    const extension = photo.content_type === "image/png" ? "png" : "jpg";
    if (hash(readFileSync(`${dir}downloaded/${photo.sort}.${extension}`)) !== photo.sha256) throw new Error(`Stored photo differs: ${photo.sort}`);
  }
  const result = {
    verified_at: new Date().toISOString(), club: club[0].name,
    competition: manifest.competition, season: manifest.season,
    players: 15, coaches: 2, photos_verified_by_sha256: 15,
    all_fields_match: true, existing_licenses_preserved: true,
    license_numbers_not_provided: 17, coaches_without_source_photos: 2,
    tests_run: false, build_run: false,
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --check-uploads or --verify.");
}
