import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Realway A2/photos";
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

const club_id = "2bc39e25-4b29-49e9-a2b2-255f068b5ef0";
const competition_id = "d74bc0b4-99f1-4313-8c15-463f76d06764";

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  const before = await (await api(`rest/v1/licenses?select=id&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (before.length) throw new Error("Existing licenses require reconciliation.");
  save("licenses-before", before);
  const team = await (await api(`rest/v1/teams?select=name,competition:competitions(name,season:seasons(name,is_current))&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (team.length !== 1 || team[0].name !== "Realway" || team[0].competition.name !== "A2 liga jug KSBiH" || !team[0].competition.season.is_current) throw new Error("Team or competition mismatch.");
  const folders = await (await api(`rest/v1/license_folders?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (folders.length !== 1) throw new Error("Folder missing.");
  // [prezime, ime, datum rođenja, mjesto, visina, pozicija] — Lamar Mujkić (#8 na spisku) izostavljen po uputi saveza
  const players = [
    ["Popadić", "Nikola", "2006-03-09", "Sarajevo", 197, "C"],
    ["Džemić", "Ibrahim", "2010-05-29", "Sarajevo", 192, "SG"],
    ["Jašarević", "Ali", "2010-07-14", "Sarajevo", 189, "SG"],
    ["Hasanbašić", "Mak", "2010-06-06", "Sarajevo", 191, "SG"],
    ["Behrem", "Jasmin", "2010-04-10", "Travnik", 183, "SG"],
    ["Terzić", "Rajan", "2010-10-02", "Sarajevo", 195, "SF"],
    ["Sultanović", "Davud", "2011-04-08", "Travnik", 183, "SG"],
    ["Mujarić", "Armen", "2011-08-07", "Sarajevo", 196, "C"],
    ["Subašić", "Aldin", "2008-08-22", "Sarajevo", 202, "C"],
    ["Džihić", "Kaid", "2009-12-22", "Sarajevo", 195, "SF"],
    ["Pošković", "Omar", "2010-03-06", "Sarajevo", 196, "C"],
    ["Mustafić", "Adnan", "2009-10-21", "Sarajevo", 193, "SF"],
    ["Dolovac", "Ahmed", "2009-08-24", "Sarajevo", 194, "C"],
    ["Buturović", "Tarik", "2009-08-16", "Sarajevo", 190, "SG"],
    ["Karabdić", "Vedran", "2008-06-03", "Sarajevo", 193, "C"],
    ["Mostarac", "Dani", "2009-12-11", "Sarajevo", 195, "SF"],
    ["Lulić", "Ajdin", "2012-10-05", "Jablanica", 185, "SG"],
    ["Delić", "Edis", "2008-08-22", "Zenica", 210, "C"],
  ];
  const officials = [
    ["Hadžihalilović", "Enes", "Trener"],
    ["Mulaosmanović", "Semir", "Trener"],
    ["Subašić", "Adnan", "Službeno lice"],
    ["Džakmić", "Ohran", "Službeno lice"],
    ["Džemić", "Nedim", "Službeno lice"],
    ["Džihić", "Kaid", "Službeno lice"],
  ];
  const upper = text => text.normalize("NFC").toLocaleUpperCase("bs");
  const files = readdirSync(sourceDir).map(f => f.normalize("NFC"));
  const photos = [];
  const photoFor = (first, last) => {
    const name = `${upper(first)} ${upper(last)}`;
    const matches = files.filter(f => f.replace(/\.(jpe?g|png)$/i, "") === name);
    if (matches.length !== 1) throw new Error(`Photo mismatch: ${first} ${last}`);
    const original = readdirSync(sourceDir).map(f => `${sourceDir}/${f}`).find(p => p.normalize("NFC").endsWith(`/${matches[0]}`));
    const source = /\.png$/i.test(matches[0]) ? readdirSync(`${dir}converted`).map(f => `${dir}converted/${f}`).find(p => p.normalize("NFC").endsWith(`/${name}.jpg`)) : original;
    if (!source) throw new Error(`Converted photo missing: ${first} ${last}`);
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${first} ${last}`);
    const photo = {
      index: photos.length + 1, person: `${first} ${last}`, original, source,
      original_sha256: hash(original), sha256: hash(source), size: bytes.length,
      content_type: "image/jpeg", path: `${club_id}/realway-a2-2026-27-${randomUUID()}.jpg`,
    };
    photos.push(photo);
    return photo.path;
  };
  const records = [
    ...players.map(([last_name, first_name, birth_date, birth_place, height_cm, position], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place, height_cm, position, license_no: null,
      photo_path: photoFor(first_name, last_name), sort: i + 1,
    })),
    ...officials.map(([last_name, first_name, role], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role,
      first_name, last_name, birth_date: null, birth_place: null,
      height_cm: null, position: null, license_no: null, photo_path: null, sort: i + 1,
    })),
  ];
  const unused = files.filter(f => !photos.some(p => p.original.normalize("NFC").endsWith(`/${f}`)));
  if (unused.length !== 1 || unused[0] !== "LAMAR MUJKIĆ.jpg") throw new Error(`Unexpected unused photos: ${unused.join(", ")}`);
  if (records.length !== 24 || photos.length !== 18) throw new Error("Unexpected roster or photograph counts.");
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK Realway", team: "Realway", competition: "A2 liga jug KSBiH", season: "2026/27", club_id, competition_id,
    source: [
      "/Users/tarikvelic/Downloads/Realway A2/Spisak za licenciranje A2 - JUG 2026-27 KK Realway.pdf",
      "/Users/tarikvelic/Downloads/Realway A2/Spisak za licenciranje A2 - JUG 2026-27 KK Realway.doc",
      "/Users/tarikvelic/Downloads/Realway A2/A2 KK REALWAY 26-27.zip",
    ],
    photos,
    missing_photos: records.filter(r => !r.photo_path).map(r => `${r.first_name} ${r.last_name}`),
    notes: [
      "Email „FW: A2 LIGA KK REALWAY, SPISAK I FOTOGRAFIJE“ (KK Realway 21.10.2026 11:54, forwarded by KSKS 16:15 with „Bez LAMARA MUJKIĆA“).",
      "Lamar Mujkić (#8 on the list, born 2011-07-01) and his photo left out per the KSKS instruction.",
      "Positions normalized: BEK → SG, KRILO → SF, CENTAR → C; Omar Pošković „CENTAR,4“ stored as C.",
      "Aldin Subašić birth place „SARSJEVO“ corrected to Sarajevo.",
      "Kaid Džihić appears both as player #11 and as službeno lice #10; both licenses created as listed.",
      "PNG photos (6) flattened to JPEG; no official photos were provided.",
      "A2 license folder already existed (created 2026-10-20).",
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
    photos_verified: manifest.photos.length, records_with_photos: actual.filter(r => r.photo_path).length,
    missing_photos: manifest.missing_photos, all_fields_match: true,
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --import or --verify.");
}
