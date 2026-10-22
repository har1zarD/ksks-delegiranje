import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
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

const club_id = "dbbb7b49-39cd-4f90-8ef7-f745dc97dcca";
const competition_id = "443667aa-44cf-4c3c-9934-5b3d426c8de4";
const original = "/Users/tarikvelic/Downloads/25869.jpg";
const source = `${dir}irmela-kaltic.jpg`;

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  const before = await (await api(`rest/v1/licenses?select=id,kind,first_name,last_name,sort&club_id=eq.${club_id}&competition_id=eq.${competition_id}&order=kind,sort`)).json();
  save("licenses-before", before);
  const players = before.filter(r => r.kind === "player");
  if (players.length !== 17 || players.some(r => r.last_name === "Kaltić") || Math.max(...players.map(r => r.sort)) !== 17) throw new Error("Existing roster differs from the expected 17 players.");
  const bytes = readFileSync(source);
  if (bytes.length > 5242880) throw new Error("Photo exceeds storage limit.");
  const photo = {
    index: 1, person: "Irmela Kaltić", original, source,
    original_sha256: hash(original), sha256: hash(source), size: bytes.length,
    content_type: "image/jpeg", path: `${club_id}/brcko-a1-2026-27-${randomUUID()}.jpg`,
  };
  const records = [{
    id: randomUUID(), club_id, competition_id, kind: "player", role: null,
    first_name: "Irmela", last_name: "Kaltić", birth_date: "2009-07-03", birth_place: null,
    height_cm: null, position: null, license_no: null, photo_path: photo.path, sort: 18,
  }];
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "Brčko Distrikt", competition: "A1 liga žene", season: "2026/27", club_id, competition_id,
    source: "Email „FW: Irmela Kaltić“ (KK Brčko Distrikt 21.10.2026 23:11, forwarded by KSKS 22.10.2026); inline photo 25869.jpg", photos: [photo],
    notes: [
      "Email body gives only name and birth date 03.07.2009; height and birth place not provided, left empty.",
      "Added as player 18 after the 17 existing Brčko A1 licenses. Photo uploaded unchanged.",
    ],
  });
  console.log("Prepared 1 license.");
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
  console.log(`Uploaded ${manifest.photos.length} photo, inserted ${records.length} license.`);
} else if (mode === "--verify") {
  const manifest = read("manifest"), expected = read("licenses-insert");
  const actual = await (await api(`rest/v1/licenses?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}&order=kind,sort`)).json();
  save("licenses-after", actual);
  for (const r of expected) {
    const stored = actual.find(a => a.id === r.id);
    if (!stored || Object.keys(r).some(k => stored[k] !== r[k])) throw new Error(`Record mismatch: ${r.first_name} ${r.last_name}`);
  }
  for (const p of manifest.photos) {
    const bytes = Buffer.from(await (await api(`storage/v1/object/authenticated/licenses/${p.path}`)).arrayBuffer());
    if (createHash("sha256").update(bytes).digest("hex") !== p.sha256) throw new Error(`Stored photo differs: ${p.person}`);
  }
  const result = {
    verified_at: new Date().toISOString(), club: manifest.club, competition: manifest.competition,
    players: actual.filter(r => r.kind === "player").length, officials: actual.filter(r => r.kind === "official").length,
    records_with_photos: actual.filter(r => r.photo_path).length, new_record_matches: true, photo_verified: true,
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --import or --verify.");
}
