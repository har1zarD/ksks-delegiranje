import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const competition_id = "443667aa-44cf-4c3c-9934-5b3d426c8de4";
const club_id = "202e24b8-5a8c-4329-8542-be04f6061cdb";
const roster = readFileSync(`${dir}source/roster.txt`, "utf8");
const existing = JSON.parse(readFileSync(`${dir}licenses-before.json`, "utf8"));
if (existing.length) throw new Error("Folder is no longer assumed empty; reconcile before importing.");

const players = [
  ["Bajramović", "Amina", "2010-12-01", "Gračanica"],
  ["Beganović", "Paša", "2010-05-29", "Bijeljina"],
  ["Bešić", "Šejla", "2008-09-10", "Bihać"],
  ["Džambo", "Amina", "2010-11-24", "Tuzla"],
  ["Džebo", "Nejra", "2010-05-25", "Mostar"],
  ["Ferhatović", "Amina", "2012-03-23", "Gračanica"],
  ["Hasić", "Aida", "2012-07-03", "Tuzla"],
  ["Hasić", "Amina", "2012-07-03", "Gračanica"],
  ["Hrvić", "Farah", "2009-09-23", "Gračanica"],
  ["Hrnjičić", "Šejma", "2010-11-29", "Gračanica"],
  ["Kovačević", "Dajra", "2011-05-06", "Gračanica"],
  ["Mehinbašić", "Adna", "2010-04-05", "Gračanica"],
  ["Mešinović", "Lejla", "2012-04-28", "Tuzla"],
  ["Muminović", "Najla", null, "Zenica"],
  ["Šabić", "Ajlin", "2011-03-23", "Tuzla"],
  ["Žunić", "Selma", "2011-03-06", "Tuzla"],
];
const officials = [
  ["Hasić", "Edin", "1974-02-25", "Tuzla", "Izvršni direktor", 20],
  ["Softić", "Alma", "1980-12-25", "Tuzla", "Trener", 17],
  ["Baraković", "Mersed", "1961-03-03", "Tuzla", "Pomoćni trener", 18],
  ["Operhal", "Saša", "1975-01-01", "Sarajevo", "Ljekar", 19],
  ["Bešić", "Šejla", "2008-09-10", "Bihać", "Službeni predstavnik", 3],
];
const photos = Array.from({ length: 20 }, (_, index) => {
  const source = `${dir}source/word/media/image${index + 1}.jpeg`;
  const buffer = readFileSync(source);
  return {
    image: index + 1,
    source,
    path: `${club_id}/gstars-2026-27-${randomUUID()}.jpg`,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    size: buffer.length,
  };
});

function record([last_name, first_name, birth_date, birth_place], kind, role, sort, image) {
  if (!roster.includes(`${last_name} ${first_name}`.toLocaleUpperCase("bs"))) {
    throw new Error(`Name missing in roster: ${last_name} ${first_name}`);
  }
  if (birth_date) {
    const [y, m, d] = birth_date.split("-");
    if (!roster.includes(`${d}.${m}.${y}`)) throw new Error(`Date missing in source: ${birth_date}`);
  }
  return {
    id: randomUUID(), competition_id, club_id, kind, role,
    last_name, first_name, birth_date, birth_place,
    height_cm: null, position: null, license_no: null,
    photo_path: photos[image - 1].path, sort,
  };
}
const records = [
  ...players.map((p, i) => record(p, "player", null, i + 1, i + 1)),
  ...officials.map((p, i) => record(p, "official", p[4], i + 1, p[5])),
];
const pending = records.filter(r => !r.birth_date);
const ready = records.filter(r => r.birth_date);
const manifest = {
  competition: "A1 liga žene", season: "2026/27", club: "KK G-Stars",
  competition_id, club_id, players: 16, officials: 5, photos,
  notes: [
    "Graačanica spelling normalized to Gračanica.",
    "Official roles and birth details retained from the roster.",
    "Šejla Bešić has separate player and official licenses using the same source photo.",
    "License numbers, heights and positions were not supplied.",
    "Najla Muminović birth date awaits user confirmation: roster 2012-07-04, photo document 2014-07-04.",
  ],
};
for (const [name, value] of Object.entries({
  manifest, "licenses-ready": ready, "licenses-pending": pending,
  "folder-insert": [{ competition_id, club_id }],
})) writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2) + "\n");

const auth = readFileSync("/private/tmp/ksks-gstars-curl.conf", "utf8");
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (base !== "https://fxdzcncfoutxunfwcyhi.supabase.co") throw new Error("Unexpected project");
const uploadConfig = photos.map((p, i) => [
  i ? "next" : "",
  auth,
  `url = "${base}/storage/v1/object/licenses/${p.path}"`,
  'request = "POST"',
  'header = "Content-Type: image/jpeg"',
  `data-binary = "@${p.source}"`,
  `output = "${dir}upload-${p.image}.json"`,
  `write-out = "photo ${p.image}: %{http_code}\\n"`,
].filter(Boolean).join("\n")).join("\n") + "\n";
writeFileSync("/private/tmp/ksks-gstars-upload.conf", uploadConfig, { mode: 0o600 });
console.log(JSON.stringify({ ready: ready.length, pending: pending.map(p => `${p.first_name} ${p.last_name}`), photos: photos.length }));
