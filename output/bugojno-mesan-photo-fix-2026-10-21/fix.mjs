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

const club_id = "03d4df12-f427-4cda-91a3-201fd805f45c";
const ids = ["75d9239e-a384-4026-b569-d1c2c0714571", "bd754823-1783-4614-9a14-c975575fc11b"];
const oldPath = `${club_id}/bugojno-2026-27-948344ab-dc39-4698-9400-c57f2075123c.jpg`;
const source = `${dir}mersed-mesan.jpg`;
const bytes = readFileSync(source), sha256 = createHash("sha256").update(bytes).digest("hex");

const before = await (await api(`rest/v1/licenses?select=*&id=in.(${ids})`)).json();
if (before.length !== 2 || before.some(r => r.photo_path !== oldPath || r.first_name !== "Mersed" || r.last_name !== "Mešan")) throw new Error("Records differ from expected state.");
save("licenses-before", before);

const path = `${club_id}/bugojno-2026-27-${randomUUID()}.jpg`;
save("upload", await (await api(`storage/v1/object/licenses/${path}`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: bytes })).json());
save("update-result", await (await api(`rest/v1/licenses?id=in.(${ids})`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ photo_path: path }) })).json());

const after = await (await api(`rest/v1/licenses?select=*&id=in.(${ids})`)).json();
save("licenses-after", after);
if (after.length !== 2 || after.some(r => r.photo_path !== path)) throw new Error("Update not applied.");
const stored = Buffer.from(await (await api(`storage/v1/object/authenticated/licenses/${path}`)).arrayBuffer());
if (createHash("sha256").update(stored).digest("hex") !== sha256) throw new Error("Stored photo differs.");
const result = { verified_at: new Date().toISOString(), person: "Mersed Mešan", records: after.map(r => r.role), old_path: oldPath, new_path: path, sha256, photo_verified: true };
save("verification", result);
console.log(JSON.stringify(result, null, 2));
