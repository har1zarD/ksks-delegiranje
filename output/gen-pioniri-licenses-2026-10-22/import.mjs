import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
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

const club_id = "7191cfa2-1708-44eb-9a2b-e2772e50fff2";
const competition_id = "ad3e34d0-8393-46ec-a464-e0db6a898cb9";

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  const before = await (await api(`rest/v1/licenses?select=id&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (before.length) throw new Error("Existing licenses require reconciliation.");
  save("licenses-before", before);
  const team = await (await api(`rest/v1/teams?select=name,competition:competitions(name,season:seasons(name,is_current))&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (team.length !== 1 || team[0].name !== "GEN" || team[0].competition.name !== "Pioniri — Grupa 1" || !team[0].competition.season.is_current) throw new Error("Team or competition mismatch.");
  // [ime, prezime, datum rođenja, isječak]
  const players = [
    ["Damir", "Hadžić", "2012-07-28", "damir-hadzic"],
    ["Emil", "Turudić", "2012-09-07", "emil-turudic"],
    ["Feđa", "Mehmedović", "2012-11-14", "feda-mehmedovic"],
    ["Emir", "Balić", "2012-03-27", "emir-balic"],
    ["Matej", "Mijatović", "2012-03-19", "matej-mijatovic"],
    ["Ayan", "Mujkić", "2012-09-28", "ayan-mujkic"],
    ["Veljko", "Marković", "2012-05-14", "veljko-markovic"],
    ["Nijaz", "Prolić", "2012-03-19", "nijaz-prolic"],
    ["Omar", "Škrijelj", null, "omar-skrijelj"],
    ["Ajri", "Karić", "2014-12-05", "ajri-karic"],
    ["Ilaj", "Kurtanton", "2014-10-23", "ilaj-kurtanton"],
    ["Said", "Sofradžija", "2012-10-23", "said-sofradzija"],
    ["Gordan", "Tafro", "2013-10-01", "gordan-tafro"],
    ["Avdo", "Hodžić", "2013-11-19", "avdo-hodzic"],
    ["Ferid", "Karavdić", "2014-05-14", "ferid-karavdic"],
    ["Imran", "Čepić", "2015-01-30", "imran-cepic"],
    ["Emir", "Zuko", "2017-12-08", "emir-zuko"],
    ["Kerim", "Ajanović", "2017-11-03", "kerim-ajanovic"],
  ];
  // [ime, prezime, datum rođenja, mjesto rođenja]
  const officials = [
    ["Emir", "Halimić", "1970-08-10", "Sarajevo"],
    ["Zoran", "Kusmuk", "1970-08-08", "Zenica"],
  ];
  const photos = [];
  const photoFor = (first, last, slug) => {
    const source = `${dir}cropped/${slug}.jpg`, bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${first} ${last}`);
    const photo = {
      index: photos.length + 1, person: `${first} ${last}`, source, sha256: hash(source), size: bytes.length,
      content_type: "image/jpeg", path: `${club_id}/gen-pioniri-2026-27-${randomUUID()}.jpg`,
    };
    photos.push(photo);
    return photo.path;
  };
  const records = [
    ...players.map(([first_name, last_name, birth_date, slug], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place: "Sarajevo", height_cm: null, position: null, license_no: null,
      photo_path: photoFor(first_name, last_name, slug), sort: i + 1,
    })),
    ...officials.map(([first_name, last_name, birth_date, birth_place], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role: "Službeno lice",
      first_name, last_name, birth_date, birth_place, height_cm: null, position: null, license_no: null,
      photo_path: null, sort: i + 1,
    })),
  ];
  if (records.length !== 20 || photos.length !== 18) throw new Error("Unexpected roster or photograph counts.");
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK GEN", team: "GEN", competition: "Pioniri — Grupa 1", season: "2026/27", club_id, competition_id,
    source: [
      "/Users/tarikvelic/Downloads/Gen Pioniri/LISTA ZA Licenciranje takmičarska sezona    2025-2026 PIONIRI.doc",
      "Gmail (tarikvelic23) „Gen“ 22.10.2026: 99517.jpg (7 loose photos with names), 99518.jpg (9 old KSKS license cards), 99519.jpg (2 old KSKS license cards)",
    ],
    photos,
    notes: [
      "Faces cut from the photographed old license cards / loose prints (images 99517 and 99518 rotated 90°), cropped inside the print edges and upscaled to 800 px height (Lanczos + light unsharp mask).",
      "Old-card photos still show staples and parts of the KSKS stamp; Damir Hadžić's card photo is covered by a glitter overlay, face barely visible — a new photo is advisable.",
      "Spelling with diacritics from the cards / handwritten labels: Hadžić (list HADZIĆ), Feđa (FEDJA), Sofradžija (SOFRADZIJA), Hodžić (HODZIĆ), Čepić (CEPIĆ), Halimić (HALIMIC).",
      "Birth dates from the list; cross-checked against the JMBG written on the 11 old cards (all match). Omar Škrijelj: list has old license „BR L 26401“ instead of a birth date → birth_date empty.",
      "Officials listed without a function; stored as Službeno lice with birth details from the list. No official photos.",
      "Old KSKS license numbers on the cards (e.g. 26173, 26401) not stored; youth folder comes from the team.",
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
