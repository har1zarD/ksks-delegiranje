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

const club_id = "7191cfa2-1708-44eb-9a2b-e2772e50fff2";
const id = "572a5796-d866-47a6-9440-0086be8eb6b8";
const bytes = readFileSync(`${dir}emir-halimic.jpg`), sha256 = createHash("sha256").update(bytes).digest("hex");

const [before] = await (await api(`rest/v1/licenses?select=*&id=eq.${id}`)).json();
if (!before || before.last_name !== "Halimić" || before.club_id !== club_id || before.kind !== "official" || before.photo_path !== null) throw new Error("License differs from expected state.");
save("license-before", before);

const path = `${club_id}/gen-pioniri-2026-27-${randomUUID()}.jpg`;
save("upload", await (await api(`storage/v1/object/licenses/${path}`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: bytes })).json());
const changes = { role: "Trener", photo_path: path };
save("update-result", await (await api(`rest/v1/licenses?id=eq.${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(changes) })).json());

const [after] = await (await api(`rest/v1/licenses?select=*&id=eq.${id}`)).json();
save("license-after", after);
if (Object.entries(changes).some(([k, v]) => after[k] !== v) || Object.keys(before).some(k => !(k in changes) && before[k] !== after[k])) throw new Error("Update mismatch.");
const stored = Buffer.from(await (await api(`storage/v1/object/authenticated/licenses/${path}`)).arrayBuffer());
if (createHash("sha256").update(stored).digest("hex") !== sha256) throw new Error("Stored photo differs.");
const result = {
  verified_at: new Date().toISOString(), person: "Emir Halimić", club: "KK GEN", competition: "Pioniri — Grupa 1",
  role: { from: before.role, to: after.role },
  source: "/Users/tarikvelic/Downloads/1762777485_Emir_Halimic2.width-1200.webp",
  note: "Press photo (WebP); cropped above the microphones to a 4:5 head-and-shoulders portrait (400x500 px), resized to 640x800 JPEG.",
  photo_path: path, sha256, photo_verified: true, other_fields_preserved: true,
};
save("verification", result);
console.log(JSON.stringify(result, null, 2));
