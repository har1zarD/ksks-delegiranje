import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Mladost A2";
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

const club_id = "923b4c9f-85ec-473d-a927-a8fd541351a7";
const competition_id = "d74bc0b4-99f1-4313-8c15-463f76d06764";

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  const before = await (await api(`rest/v1/licenses?select=id&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (before.length) throw new Error("Existing licenses require reconciliation.");
  save("licenses-before", before);
  const team = await (await api(`rest/v1/teams?select=name,competition:competitions(name,season:seasons(name,is_current))&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (team.length !== 1 || team[0].name !== "Mladost" || team[0].competition.name !== "A2 liga jug KSBiH" || !team[0].competition.season.is_current) throw new Error("Team or competition mismatch.");
  const folders = await (await api(`rest/v1/license_folders?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (folders.length !== 1) throw new Error("Folder missing.");
  // [prezime, ime, datum rođenja, mjesto, visina, pozicija] — slika je "<redni broj>. ..." u istom redoslijedu
  const players = [
    ["Kovačević", "Adem", "2008-01-29", "Sarajevo", 186, "SF"],
    ["Parić", "Admir", "2006-02-25", "Sarajevo", 178, "SG"],
    ["Kaljun", "Afan", "2011-11-06", "Sarajevo", 170, "SG"],
    ["Kazija", "Bakir", "2007-08-04", "Zenica", 191, "SF"],
    ["Demir", "Daris", "2008-02-06", "Ilijaš", 195, "C"],
    ["Dragunić", "Vedad", "2008-04-20", "Zenica", 180, "SG"],
    ["Vranić", "Enid", "2008-09-11", "Zenica", 185, "SG"],
    ["Abdukić", "Faris", "2008-02-18", "Sarajevo", 185, "SG"],
    ["Kovačević", "Kenan", "2008-07-17", "Sarajevo", 194, "C"],
    ["Milak", "Anel", "2006-10-22", "Sarajevo", 180, "SG"],
    ["Redžo", "Mehmed Ali", "2011-02-22", "Sarajevo", 198, "C"],
    ["Musa", "Arman", "2010-10-06", "Sarajevo", 180, "SG"],
    ["Dervišević", "Harun", "2012-01-26", "Sarajevo", 195, "C"],
    ["Medunjanin", "Amar", "2004-05-23", "Sarajevo", 185, "SG"],
    ["Poturak Doenmez", "Selim", "2009-03-27", "Sarajevo", 180, "SG"],
    ["Halkić", "Ervin", "2005-02-05", "Vareš", 201, "C"],
    ["Zametica", "Nadir", "2005-12-02", "Sarajevo", 180, "SG"],
    ["Džaferagić", "Fahrudin", "2004-12-29", "Sarajevo", 201, "C"],
    ["Hodžić", "Sanjin", "2008-10-19", "Sarajevo", 185, "SG"],
    ["Džudža", "Denis", "2008-09-25", "Sarajevo", 195, "SF"],
    ["Đuzel", "Kenan", "2006-07-05", "Zenica", 200, "C"],
  ];
  // [prezime, ime, funkcija, slika]
  const officials = [
    ["Herco", "Eldin", "Trener", "TRENER 1 .  ELDIN HERCO.jpg"],
    ["Vatreš", "Hajrudin", "Trener", "TRENER 2 - HAJRUDIN VATREŠ.jpg"],
    ["Velić", "Benjamin", "Trener", "TRENER 3. BENJAMIN VELIĆ.jpg"],
    ["Jašarević", "Ibrahim", "Službeno lice", "SL. PREDSTAVNIK  -  IBRAHIM JAŠAREVIĆ.jpg"],
    ["Abdukić", "Iris", "Službeno lice", "SL. PREDSTAVNIK   -  IRIS ABDUKUIĆ.jpg"],
    ["Kahriman", "Irfan", "Službeno lice", "Sl.predstavnik  - Kahriman Irfan.jpg"],
  ];
  const documents = ["džuzel kenan prist..jpg", "pozajmica - vogosca.jpg"];
  const nfc = s => s.normalize("NFC");
  const files = readdirSync(sourceDir).filter(f => /\.jpe?g$/i.test(f));
  const byName = name => {
    const matches = files.filter(f => nfc(f) === nfc(name));
    if (matches.length !== 1) throw new Error(`Photo mismatch: ${name}`);
    return matches[0];
  };
  const byNumber = n => {
    const matches = files.filter(f => new RegExp(`^${n}\\.`).test(f));
    if (matches.length !== 1) throw new Error(`Photo mismatch: #${n}`);
    return matches[0];
  };
  const photos = [];
  const photoFor = (first, last, file) => {
    const source = `${sourceDir}/${file}`, bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${first} ${last}`);
    const photo = {
      index: photos.length + 1, person: `${first} ${last}`, source, sha256: hash(source), size: bytes.length,
      content_type: "image/jpeg", path: `${club_id}/mladost-a2-2026-27-${randomUUID()}.jpg`,
    };
    photos.push(photo);
    return photo.path;
  };
  const records = [
    ...players.map(([last_name, first_name, birth_date, birth_place, height_cm, position], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place, height_cm, position, license_no: null,
      photo_path: photoFor(first_name, last_name, byNumber(i + 1)), sort: i + 1,
    })),
    ...officials.map(([last_name, first_name, role, file], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role,
      first_name, last_name, birth_date: null, birth_place: null, height_cm: null, position: null, license_no: null,
      photo_path: photoFor(first_name, last_name, byName(file)), sort: i + 1,
    })),
  ];
  const used = new Set(photos.map(p => nfc(p.source.split("/").pop())));
  const unused = files.filter(f => !used.has(nfc(f)));
  if (unused.length !== documents.length || documents.some(d => !unused.map(nfc).includes(nfc(d)))) throw new Error(`Unexpected unused files: ${unused.join(", ")}`);
  if (records.length !== 27 || photos.length !== 27) throw new Error("Unexpected roster or photograph counts.");
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK Mladost (Ilijaš)", team: "Mladost", competition: "A2 liga jug KSBiH", season: "2026/27", club_id, competition_id,
    source: [
      "Email „FW: SPISAK“ (Ibrahim Jašarević 21.10.2026) → /Users/tarikvelic/Downloads/Mladost A2/spisak za licenciranje A2 - JUG 2026-27 word.doc",
      "Email „FW: a2 liga“ (Ibrahim Jašarević 17.10.2026), 29 attachments → /Users/tarikvelic/Downloads/Mladost A2",
    ],
    photos,
    documents: documents.map(d => `${sourceDir}/${d}`),
    notes: [
      "Positions normalized: BEK → SG, KRILO → SF, CENTAR → C.",
      "Player photos matched by the list number in the file name; officials by name. Photos uploaded unchanged.",
      "#11 list says „Redžo Mehmed Ali“, photo file says „Muhamed Ali Redžo“ — list used.",
      "#21 list says DŽUZEL; photo file and the signed KSBiH pristupnica say Đuzel — Đuzel used. Previous club KK Vukovi (not licensed there in this app).",
      "List remarks: Abdukić Faris and Milak Anel „ISPIS. VOG“ (pozajmica KK Vogošća attached); Poturak Doenmez Selim, Hodžić Sanjin, Džudža Denis „KOŠ DVOJNA“ (dual registration with KK Koš; club said consent follows).",
      "Officials listed without birth details. Iris Abdukić also holds a Mladost official license in Pioniri — Grupa 1.",
      "A2 license folder already existed. License numbers not assigned (none in A2 yet).",
    ],
  });
  console.log(JSON.stringify({ players: players.length, officials: officials.length, photos: photos.length }));
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
  const actual = await (await api(`rest/v1/licenses?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}&order=kind,sort`)).json();
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
  const result = {
    verified_at: new Date().toISOString(), club: manifest.club, competition: manifest.competition, season: manifest.season,
    players: actual.filter(r => r.kind === "player").length, officials: actual.filter(r => r.kind === "official").length,
    photos_verified: manifest.photos.length, records_with_photos: actual.filter(r => r.photo_path).length, all_fields_match: true,
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --import or --verify.");
}
