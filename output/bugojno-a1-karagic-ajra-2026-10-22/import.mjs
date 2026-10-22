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

const club_id = "03d4df12-f427-4cda-91a3-201fd805f45c";
const competition_id = "443667aa-44cf-4c3c-9934-5b3d426c8de4";
const source = `${dir}ajra-karagic.jpg`;

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  const club = await (await api(`rest/v1/licenses?select=id,kind,first_name,last_name,sort&club_id=eq.${club_id}&competition_id=eq.${competition_id}&order=kind,sort`)).json();
  save("licenses-before", club);
  const players = club.filter(r => r.kind === "player");
  if (players.length !== 21 || Math.max(...players.map(r => r.sort)) !== 21 || players.some(r => r.first_name === "Ajra")) throw new Error("Existing roster differs from the expected 21 players.");
  // Brojevi licenci u A1 žene su jedan niz kroz sve ekipe; nova licenca dobija sljedeći slobodan
  const numbers = (await (await api(`rest/v1/licenses?select=license_no&competition_id=eq.${competition_id}`)).json()).map(r => r.license_no);
  if (numbers.some(n => !/^\d{3}$/.test(n ?? ""))) throw new Error("Unexpected license number format.");
  const license_no = String(Math.max(...numbers.map(Number)) + 1).padStart(3, "0");
  const bytes = readFileSync(source);
  if (bytes.length > 5242880) throw new Error("Photo exceeds storage limit.");
  const photo = {
    index: 1, person: "Ajra Karagić", original: "/Users/tarikvelic/Downloads/AJRA.jpg", source,
    sha256: hash(source), size: bytes.length, content_type: "image/jpeg", path: `${club_id}/bugojno-2026-27-${randomUUID()}.jpg`,
  };
  const records = [{
    id: randomUUID(), club_id, competition_id, kind: "player", role: null,
    first_name: "Ajra", last_name: "Karagić", birth_date: "2011-02-03", birth_place: null,
    height_cm: 167, position: "PG", license_no, photo_path: photo.path, sort: 22,
  }];
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK Bugojno", competition: "A1 liga žene", season: "2026/27", club_id, competition_id,
    source: "/Users/tarikvelic/Downloads/DOC.pdf (signed and stamped Obrazac 1, dated 20.10.2026, row 22)", photos: [photo],
    notes: [
      "Row 22: AJRA Karagić, 03.02.2011, klub registracije Bugojno, 167 cm, PLAY → PG. Rows 1–21 and the 9 officials match the existing licenses.",
      "birth_place left empty like the other Bugojno players (the list column is the registration club, not place of birth).",
      `License number ${license_no}: next free number in the A1 žene sequence (001–111 assigned on 2026-10-22).`,
      "Photo /Users/tarikvelic/Downloads/AJRA.jpg (same file as Bugojno-profilne/AJRA.jpg) uploaded unchanged.",
    ],
  });
  console.log(`Prepared Ajra Karagić with license ${license_no}.`);
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
  const actual = await (await api(`rest/v1/licenses?select=*&competition_id=eq.${competition_id}`)).json();
  save("licenses-after", actual.filter(r => r.club_id === club_id));
  for (const r of expected) {
    const stored = actual.find(a => a.id === r.id);
    if (!stored || Object.keys(r).some(k => stored[k] !== r[k])) throw new Error(`Record mismatch: ${r.first_name} ${r.last_name}`);
  }
  const numbers = actual.map(r => r.license_no);
  if (new Set(numbers).size !== numbers.length) throw new Error("Duplicate license numbers in A1 žene.");
  for (const p of manifest.photos) {
    const bytes = Buffer.from(await (await api(`storage/v1/object/authenticated/licenses/${p.path}`)).arrayBuffer());
    if (createHash("sha256").update(bytes).digest("hex") !== p.sha256) throw new Error(`Stored photo differs: ${p.person}`);
  }
  const own = actual.filter(r => r.club_id === club_id);
  const result = {
    verified_at: new Date().toISOString(), club: manifest.club, competition: manifest.competition,
    players: own.filter(r => r.kind === "player").length, officials: own.filter(r => r.kind === "official").length,
    license_no: expected[0].license_no, a1_zene_total: actual.length, license_numbers_unique: true, photo_verified: true,
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --import or --verify.");
}
