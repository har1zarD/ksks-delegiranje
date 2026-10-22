import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const save = (name, value) => writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2) + "\n");
const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
if (!base || !key) throw new Error("Missing connection configuration.");
const api = async (path, init = {}) => {
  const res = await fetch(`${base}/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, ...init.headers } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res;
};

const club_id = "3d01197f-2001-4b0e-82f3-0e98e490a5ba";
const competition_id = "d74bc0b4-99f1-4313-8c15-463f76d06764";
const V = "/Users/tarikvelic/Documents/ViberDownloads/";
// Redoslijed slika = redoslijed imena iz poruke (screenshot 23:05)
const people = [
  ["Faruk", "Čolić", "faruk-colic.jpg", "0-02-05-78c04231be5b00ec43272c8046f1a94765c97fa1c513734f9b6c9d925dd60351_22ac08b1c95.jpg"],
  ["Harun", "Čolić", "harun-colic.jpg", "0-02-05-055c1987fcec878d4a4915c94c477352eecd27719634dd10415e2967eef0e5ba_22ac08b15fe.jpg"],
  ["Aldin", "Berbić", "aldin-berbic.jpg", "0-02-05-a546e9352088b127ca01d8328c741d49d31d9f55f6d27195e874a7ed9d728875_22ac08b453c.jpg"],
  ["Boris", "Ćuković", "boris-cukovic.jpg", "0-02-05-e62175a750f7b25f0db81f26c737f9f178492b8869416dea3b007fd919568d46_22ac08b3bf5.jpg"],
  ["Dino", "Duranović", "dino-duranovic.jpg", "0-02-05-c17a89ed517a8c2dc2ffe828026bd211976856482a9537d8edebd588df8903f5_22ac08b647f.jpg"],
  ["Amir", "Zukić", "amir-zukic.jpg", "0-02-05-646d8226d3112e69947ee237482bcccce48308e4ab9bc8b6b0950d82bedb2b0f_22ac08b56bc.jpg"],
];
const before = await (await api(`rest/v1/licenses?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}&kind=eq.official`)).json();
save("licenses-before", before);
const updates = [];
for (const [first, last, file, original] of people) {
  const rows = before.filter(r => r.first_name === first && r.last_name === last);
  if (!rows.length || rows.some(r => r.photo_path !== null)) throw new Error(`License differs from expected state: ${first} ${last}`);
  const bytes = readFileSync(`${dir}${file}`), sha256 = createHash("sha256").update(bytes).digest("hex");
  // Svaka licenca svoj objekat (Harun Čolić ima dvije licence)
  for (const r of rows) {
    const path = `${club_id}/vukovi-a2-2026-27-${randomUUID()}.jpg`;
    await api(`storage/v1/object/licenses/${path}`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: bytes });
    await api(`rest/v1/licenses?id=eq.${r.id}&photo_path=is.null`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photo_path: path }) });
    updates.push({ id: r.id, person: `${first} ${last}`, role: r.role, original: V + original, source: `${dir}${file}`, path, sha256 });
  }
}
save("updates", updates);

const after = await (await api(`rest/v1/licenses?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
save("licenses-after", after);
for (const u of updates) {
  const a = after.find(r => r.id === u.id), b = before.find(r => r.id === u.id);
  if (a.photo_path !== u.path || Object.keys(b).some(k => k !== "photo_path" && b[k] !== a[k])) throw new Error(`Update mismatch: ${u.person}`);
  const stored = Buffer.from(await (await api(`storage/v1/object/authenticated/licenses/${u.path}`)).arrayBuffer());
  if (createHash("sha256").update(stored).digest("hex") !== u.sha256) throw new Error(`Stored photo differs: ${u.person}`);
}
const result = {
  verified_at: new Date().toISOString(), club: "KK Vukovi", competition: "A2 liga jug KSBiH",
  photos_added: updates.map(u => `${u.person} (${u.role})`), licenses_without_photo: after.filter(r => !r.photo_path).map(r => `${r.first_name} ${r.last_name}`),
  notes: ["Photo order mapped to the name list in the user's screenshot.", "All crops 4:5 head and shoulders; Amir Zukić upscaled from 470x588 to 640x800, the rest kept at crop size."],
  photos_verified: true, other_fields_preserved: true,
};
save("verification", result);
console.log(JSON.stringify(result, null, 2));
