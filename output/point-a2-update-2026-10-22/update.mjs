import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Point A2 v2";
const save = (name, value) => writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2) + "\n");
const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
if (!base || !key) throw new Error("Missing connection configuration.");
const api = async (path, init = {}) => {
  const res = await fetch(`${base}/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, ...init.headers } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res;
};

const club_id = "436f8af2-7691-4a1b-8666-71057277d861";
const competition_id = "d74bc0b4-99f1-4313-8c15-463f76d06764";
// Datumi sa novog spiska "FINAL.doc" (22.10.2026) za igrače kojima je bila samo godina
const dates = {
  "Muhedinović": "2009-02-21", "Čatal": "2008-01-12", "Pešto": "2009-09-11", "Duranović": "2009-01-05",
  "Popić": "2008-12-17", "Musić": "2007-09-19", "Nurkić": "2007-08-08", "Varaga": "2009-11-03",
};
// Datumi već upisani iz pasoša; novi spisak ih mora potvrditi
const confirmed = {
  "Lokvančić": "2009-08-08", "Uzeirbegović": "2008-04-27", "Habota": "2009-06-26", "Ramić": "2008-05-14", "Sprečić": "2007-08-04",
  "Lukavica": "2009-07-12", "Masleša": "2010-02-12", "Hadžić": "2007-12-10", "Brekalović": "2009-10-20",
};
// [prezime, fajl, izrezana]
const photos = [
  ["Duranović", "Slika-Duranović Vedad.jpg", false],
  ["Nurkić", "Slika-Nurkić Kenan.jpg", false],
  ["Pešto", "Slika-Pešto Emin.jpg", false],
  ["Popić", "andrej-popic.jpg", true],
  ["Varaga", "Slika-Varaga Adrijan.jpg", false],
  ["Musić", "ammar-music.jpg", true],
];

const before = await (await api(`rest/v1/licenses?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}&kind=eq.player`)).json();
if (before.length !== 17) throw new Error("Expected 17 players.");
save("licenses-before", before);
const byLast = last => {
  const rows = before.filter(r => r.last_name === last);
  if (rows.length !== 1) throw new Error(`Player not unique: ${last}`);
  return rows[0];
};
for (const [last, date] of Object.entries(confirmed)) if (byLast(last).birth_date !== date) throw new Error(`Existing date differs from new list: ${last}`);
for (const last of Object.keys(dates)) if (byLast(last).birth_date !== null) throw new Error(`Expected empty birth date: ${last}`);
for (const [last] of photos) if (byLast(last).photo_path !== null) throw new Error(`Expected no photo: ${last}`);
if (byLast("Musić").first_name !== "Amar") throw new Error("Musić first name differs.");

const nfc = s => s.normalize("NFC");
const find = (folder, file) => readdirSync(folder).map(f => `${folder}/${f}`).find(p => nfc(p).endsWith(`/${nfc(file)}`));
const changes = new Map(Object.keys(dates).map(last => [byLast(last).id, { birth_date: dates[last] }]));
changes.get(byLast("Musić").id).first_name = "Ammar";
const uploads = [];
for (const [last, file, cropped] of photos) {
  const source = cropped ? `${dir}cropped/${file}` : find(sourceDir, file);
  if (!source) throw new Error(`Photo missing: ${last}`);
  const bytes = readFileSync(source);
  if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${last}`);
  const path = `${club_id}/point-a2-2026-27-${randomUUID()}.jpg`;
  await api(`storage/v1/object/licenses/${path}`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: bytes });
  const id = byLast(last).id;
  changes.set(id, { ...(changes.get(id) ?? {}), photo_path: path });
  uploads.push({ last, source, path, sha256: hash(source) });
}
save("uploads", uploads);
for (const [id, patch] of changes) await api(`rest/v1/licenses?id=eq.${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
save("changes", [...changes].map(([id, patch]) => ({ id, name: `${before.find(r => r.id === id).first_name} ${before.find(r => r.id === id).last_name}`, ...patch })));

const after = await (await api(`rest/v1/licenses?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
save("licenses-after", after);
for (const b of before) {
  const a = after.find(r => r.id === b.id), patch = changes.get(b.id) ?? {};
  if (Object.keys(b).some(k => (k in patch ? a[k] !== patch[k] : a[k] !== b[k]))) throw new Error(`Unexpected state: ${b.last_name}`);
}
for (const u of uploads) {
  const stored = Buffer.from(await (await api(`storage/v1/object/authenticated/licenses/${u.path}`)).arrayBuffer());
  if (createHash("sha256").update(stored).digest("hex") !== u.sha256) throw new Error(`Stored photo differs: ${u.last}`);
}
const players = after.filter(r => r.kind === "player");
const result = {
  verified_at: new Date().toISOString(), club: "KK Point", competition: "A2 liga jug KSBiH",
  birth_dates_added: Object.keys(dates).length, birth_dates_confirmed: Object.keys(confirmed).length, renamed: "Amar → Ammar Musić",
  photos_added: uploads.length, players_with_birth_date: players.filter(r => r.birth_date).length, players_with_photo: players.filter(r => r.photo_path).length,
  without_photo: after.filter(r => !r.photo_path).map(r => `${r.first_name} ${r.last_name}`),
  notes: [
    "Source: „spisak za licenciranje A2 JUG - 2026-2027 FINAL.doc“ (KK Point, 22.10.2026 17:16) and 33 attachments (Point A2 v2).",
    "All 9 passport-based dates entered earlier match the new list.",
    "Ammar: spelled so in both Musić passports (BiH and HR MRZ) and the signature; the list says Amar.",
    "Musić sent no portrait; face cropped from the HR passport (issued 2024-05-24) and upscaled. Popić cropped to head and shoulders; the other 4 photos unchanged.",
    "Lukavica birth place stays Bengazi (passport); the new list still says Tuzla. List spelling Brakalović/Hadzić/Dzanan/Muhedinovic kept as previously corrected from passports.",
  ],
  all_fields_match: true, photos_verified: true,
};
save("verification", result);
console.log(JSON.stringify(result, null, 2));
