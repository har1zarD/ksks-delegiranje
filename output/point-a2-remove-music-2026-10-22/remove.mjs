import { writeFileSync } from "node:fs";
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
const rows = await (await api(`rest/v1/licenses?select=*&club_id=eq.${club_id}&last_name=eq.Musi%C4%87`)).json();
if (rows.length !== 1 || rows[0].first_name !== "Ammar" || rows[0].competition_id !== competition_id) throw new Error(`Expected exactly one Ammar Musić in Point A2, found ${rows.length}.`);
const [lic] = rows;
save("license-deleted", lic);

// Kopija slike prije brisanja
let photoRemoved = false;
if (lic.photo_path) {
  const bytes = Buffer.from(await (await api(`storage/v1/object/authenticated/licenses/${lic.photo_path}`)).arrayBuffer());
  writeFileSync(`${dir}photo-backup.jpg`, bytes);
  const shared = await (await api(`rest/v1/licenses?select=id&photo_path=eq.${encodeURIComponent(lic.photo_path)}&id=neq.${lic.id}`)).json();
  if (!shared.length) {
    await api(`storage/v1/object/licenses`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [lic.photo_path] }) });
    photoRemoved = true;
  }
}
await api(`rest/v1/licenses?id=eq.${lic.id}`, { method: "DELETE" });

const left = await (await api(`rest/v1/licenses?select=id&id=eq.${lic.id}`)).json();
if (left.length) throw new Error("License still present.");
if (photoRemoved) {
  const res = await fetch(`${base}/storage/v1/object/authenticated/licenses/${lic.photo_path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (res.ok) throw new Error("Photo still in storage.");
}
const remaining = await (await api(`rest/v1/licenses?select=kind&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
const result = {
  verified_at: new Date().toISOString(), club: "KK Point", competition: "A2 liga jug KSBiH",
  deleted: `${lic.first_name} ${lic.last_name} (player, sort ${lic.sort})`, photo_removed_from_storage: photoRemoved,
  backup: ["license-deleted.json", "photo-backup.jpg"],
  remaining: { players: remaining.filter(r => r.kind === "player").length, officials: remaining.filter(r => r.kind === "official").length },
};
save("verification", result);
console.log(JSON.stringify(result, null, 2));
