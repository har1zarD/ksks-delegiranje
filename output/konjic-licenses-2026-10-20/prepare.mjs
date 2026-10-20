import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/a1 liga";
const competition_id = "443667aa-44cf-4c3c-9934-5b3d426c8de4";
const club_id = "29a704d6-7465-4dd3-851a-be3b023de1b0";
const base = "https://fxdzcncfoutxunfwcyhi.supabase.co";
const roster = readFileSync(`${dir}roster.txt`, "utf8");
const existing = JSON.parse(readFileSync(`${dir}licenses-before.json`, "utf8"));
if (existing.length) throw new Error("Reconcile existing licenses before importing.");

const title = s => s[0] + s.slice(1).toLocaleLowerCase("bs");
const photoKey = s => s.toLowerCase().replace(/đ/g, "d").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/\.jpg$/, "").trim().split(/\s+/).sort().join(" ");
const photoFiles = readdirSync(sourceDir).filter(f => f.endsWith(".jpg"));
const byName = new Map(photoFiles.map(file => [photoKey(file), file]));
if (byName.size !== 19 || photoFiles.length !== 19) throw new Error("Unexpected or ambiguous photo set.");

const players = [];
const photos = [];
for (const match of roster.matchAll(/^\s*(\d+)\s+(\S+)\s+(\S+)\s+(\d{2})\.(\d{2})\.(\d{4})\s+KONJIC\s+-\s+-\s+(Ž\d+\/\d+)\s*$/gm)) {
  const [, order, last, first, day, month, year, license_no] = match;
  const file = byName.get(photoKey(`${last} ${first}`));
  if (!file) throw new Error(`Missing photograph: ${last} ${first}`);
  const source = `${sourceDir}/${file}`;
  const bytes = readFileSync(source);
  if (bytes.length > 5242880 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`Unsupported photo: ${file}`);
  const photo_path = `${club_id}/konjic-2026-27-${randomUUID()}.jpg`;
  photos.push({
    index: Number(order), source, path: photo_path, file, size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  players.push({
    id: randomUUID(), competition_id, club_id, kind: "player", role: null,
    last_name: title(last), first_name: title(first),
    birth_date: `${year}-${month}-${day}`, birth_place: "Konjic",
    height_cm: null, position: null, license_no, photo_path, sort: Number(order),
  });
}
const officials = [];
const roles = { TRENER: "Trener", FIZIOTERAPEUT: "Fizioterapeut", "SLUŽBENO LICE": "Službeno lice" };
const officialText = roster.split("SLUŽBENA LICA")[1];
for (const match of officialText.matchAll(/^\s*(\d+)\s+(TRENER|FIZIOTERAPEUT|SLUŽBENO LICE)\s+(\S+)\s+(\S+)\s+(Ž(?:T|FT|SP)\d+\/\d+)\s*$/gm)) {
  const [, order, role, last, first, license_no] = match;
  officials.push({
    id: randomUUID(), competition_id, club_id, kind: "official", role: roles[role],
    last_name: title(last), first_name: title(first),
    birth_date: null, birth_place: null, height_cm: null, position: null,
    license_no, photo_path: null, sort: Number(order),
  });
}
if (players.length !== 19 || officials.length !== 3) throw new Error("Roster extraction count mismatch.");
if (new Set(photos.map(p => p.file)).size !== 19) throw new Error("Photo reused unexpectedly.");
const records = [...players, ...officials];
if (new Set(records.map(r => r.license_no)).size !== 22) throw new Error("Duplicate license numbers.");
const manifest = {
  club: "KK Konjic", competition: "A1 liga žene", season: "2026/27",
  club_id, competition_id, photos,
  source: `${sourceDir}/spisak za licenciranje  2026-2027.pdf`,
  notes: [
    "Birth dates and license numbers copied from the licensing PDF.",
    "Coach surname retained as Ravnjka, exactly as printed in the source.",
    "No official photographs or birth details were provided.",
    "Ajna Mehić original JPEG is truncated at the bottom; visible portrait retained without modification.",
    "Unspecified player heights and positions remain null.",
  ],
};
for (const [name, value] of Object.entries({
  manifest, "licenses-insert": records, "folder-insert": [{ competition_id, club_id }],
})) writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2) + "\n");

mkdirSync(`${dir}downloaded`, { recursive: true });
const auth = readFileSync("/private/tmp/ksks-konjic-auth.conf", "utf8");
for (const operation of ["upload", "download"]) {
  const config = photos.map((photo, index) => [
    index ? "next" : "",
    auth,
    `url = "${base}/storage/v1/object/${operation === "download" ? "authenticated/" : ""}licenses/${photo.path}"`,
    ...(operation === "upload"
      ? ['request = "POST"', 'header = "Content-Type: image/jpeg"', `data-binary = "@${photo.source}"`]
      : []),
    `output = "${dir}${operation === "upload" ? `upload-${photo.index}.json` : `downloaded/image${photo.index}.jpg`}"`,
    `write-out = "photo ${photo.index}: %{http_code}\\n"`,
  ].filter(Boolean).join("\n")).join("\n") + "\n";
  writeFileSync(`/private/tmp/ksks-konjic-${operation}.conf`, config, { mode: 0o600 });
}
console.log(JSON.stringify({ players: players.length, officials: officials.length, photos: photos.length }));
