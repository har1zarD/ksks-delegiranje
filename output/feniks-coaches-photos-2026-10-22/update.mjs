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

const club_id = "530834e7-b357-4e69-beea-aa64d53d0697";
const V = "/Users/tarikvelic/Documents/ViberDownloads/";
// [id, prezime, isječak, original]
const people = [
  ["7db717fd-eb37-4f60-8d1f-7730b1c045a6", "Balderin", "hamid-balderin.jpg", `${V}0-02-05-bcafe6d96e5a026e4cd525eddaf60c5c6ae5853ab2609900bcfd382ffac9dc74_22a35a49faf.jpg`],
  ["01f8723e-a822-4ec0-882a-43a4af26e866", "Sudar", "sanin-sudar.jpg", `${V}0-02-05-201b2331b1a8777ed95163b5295ad97431280d49ed086874f5582374c79f1314_22a35a4a5ba.jpg`],
];
const ids = people.map(p => p[0]);
const before = await (await api(`rest/v1/licenses?select=*&id=in.(${ids})`)).json();
for (const [id, last] of people) {
  const r = before.find(b => b.id === id);
  if (!r || r.last_name !== last || r.club_id !== club_id || r.kind !== "official" || r.photo_path !== null) throw new Error(`License differs from expected state: ${last}`);
}
save("licenses-before", before);

const updates = [];
for (const [id, last, file, original] of people) {
  const bytes = readFileSync(`${dir}${file}`), sha256 = createHash("sha256").update(bytes).digest("hex");
  const path = `${club_id}/feniks-pioniri-2026-27-${randomUUID()}.jpg`;
  await api(`storage/v1/object/licenses/${path}`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: bytes });
  await api(`rest/v1/licenses?id=eq.${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "Trener", photo_path: path }) });
  updates.push({ id, last, original, source: `${dir}${file}`, path, sha256 });
}
save("updates", updates);

const after = await (await api(`rest/v1/licenses?select=*&id=in.(${ids})`)).json();
save("licenses-after", after);
for (const u of updates) {
  const a = after.find(r => r.id === u.id), b = before.find(r => r.id === u.id);
  if (a.role !== "Trener" || a.photo_path !== u.path || Object.keys(b).some(k => !["role", "photo_path"].includes(k) && b[k] !== a[k])) throw new Error(`Update mismatch: ${u.last}`);
  const stored = Buffer.from(await (await api(`storage/v1/object/authenticated/licenses/${u.path}`)).arrayBuffer());
  if (createHash("sha256").update(stored).digest("hex") !== u.sha256) throw new Error(`Stored photo differs: ${u.last}`);
}
const result = {
  verified_at: new Date().toISOString(), club: "KK Feniks", competition: "Pioniri — Grupa 1",
  updated: after.map(r => `${r.first_name} ${r.last_name}: ${before.find(b => b.id === r.id).role} → ${r.role}, photo added`),
  skipped: ["Semir Smajlović — no license in KK Feniks (photo 0-02-05-49fc…_22a35a4809a.jpg not used)"],
  notes: ["Balderin: outdoor photo cropped to 4:5 (560x700) and resized to 640x800. Sudar: gym photo cropped to 4:5 (300x375) and upscaled to 640x800."],
  photos_verified: true, other_fields_preserved: true,
};
save("verification", result);
console.log(JSON.stringify(result, null, 2));
