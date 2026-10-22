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

const club_id = "436f8af2-7691-4a1b-8666-71057277d861";
const competition_id = "d74bc0b4-99f1-4313-8c15-463f76d06764";
const V = "/Users/tarikvelic/Documents/ViberDownloads/";
// [prezime, funkcija, isječak, original, napomena]
const people = [
  ["Muminović", "Trener", "mirnes-muminovic.jpg", `${V}0-02-05-09d0a5cca11a549cf11f52cc11140d889d579bdc17a5c04489265732aebd9f27_22a35a58862.jpg`, "Facebook post screenshot; cropped to 4:5 (520x650) below the app UI, resized to 640x800."],
  ["Mujezinović", "Službeno lice", "adis-mujezinovic.jpg", `${V}0-02-05-9eb230d1fc3dad6a07e65a95d83444e8a3a921e401cc90260d35809438dd88bf_22a35a56617.jpg`, "Car selfie; cropped to 4:5 (600x750), resized to 640x800."],
  ["Kapetanović", "Službeno lice", "hermin-kapetanovic.jpg", "/Users/tarikvelic/Downloads/1657705101508.jpeg", "Source only 200x200 px; cropped to 160x200 and upscaled 4x to 640x800 — will look soft in print."],
];
const before = await (await api(`rest/v1/licenses?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}&kind=eq.official`)).json();
save("licenses-before", before);
const updates = [];
for (const [last, role, file, original, note] of people) {
  const rows = before.filter(r => r.last_name === last);
  if (rows.length !== 1 || rows[0].role !== role || rows[0].photo_path !== null) throw new Error(`License differs from expected state: ${last}`);
  const bytes = readFileSync(`${dir}${file}`), sha256 = createHash("sha256").update(bytes).digest("hex");
  const path = `${club_id}/point-a2-2026-27-${randomUUID()}.jpg`;
  await api(`storage/v1/object/licenses/${path}`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: bytes });
  await api(`rest/v1/licenses?id=eq.${rows[0].id}&photo_path=is.null`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photo_path: path }) });
  updates.push({ id: rows[0].id, person: `${rows[0].first_name} ${last}`, role, original, source: `${dir}${file}`, path, sha256, note });
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
  verified_at: new Date().toISOString(), club: "KK Point", competition: "A2 liga jug KSBiH",
  photos_added: updates.map(u => `${u.person} (${u.role})`), licenses_without_photo: after.filter(r => !r.photo_path).length,
  photos_verified: true, other_fields_preserved: true,
};
save("verification", result);
console.log(JSON.stringify(result, null, 2));
