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

const club_id = "dbbb7b49-39cd-4f90-8ef7-f745dc97dcca";
const id = "12152db7-cc84-4ecf-b00b-7481fd8ed3dd";
const bytes = readFileSync(`${dir}adem-velagic.jpg`), sha256 = createHash("sha256").update(bytes).digest("hex");

const [before] = await (await api(`rest/v1/licenses?select=*&id=eq.${id}`)).json();
if (!before || before.last_name !== "Velagić" || before.role !== "Trener" || before.club_id !== club_id || before.photo_path !== null) throw new Error("License differs from expected state.");
save("license-before", before);

const path = `${club_id}/brcko-a1-2026-27-${randomUUID()}.jpg`;
save("upload", await (await api(`storage/v1/object/licenses/${path}`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: bytes })).json());
save("update-result", await (await api(`rest/v1/licenses?id=eq.${id}&photo_path=is.null`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ photo_path: path }) })).json());

const [after] = await (await api(`rest/v1/licenses?select=*&id=eq.${id}`)).json();
save("license-after", after);
if (after.photo_path !== path || Object.keys(before).some(k => k !== "photo_path" && before[k] !== after[k])) throw new Error("Update mismatch.");
const stored = Buffer.from(await (await api(`storage/v1/object/authenticated/licenses/${path}`)).arrayBuffer());
if (createHash("sha256").update(stored).digest("hex") !== sha256) throw new Error("Stored photo differs.");
const result = {
  verified_at: new Date().toISOString(), person: `${after.first_name} ${after.last_name}`, club: "Brčko Distrikt", competition: "A1 liga žene",
  source: "Email „FW:“ (KK Brčko Distrikt 22.10.2026 15:49); attachment /Users/tarikvelic/Downloads/Adem Velagić.jpg",
  note: "Existing coach license (Trener, sort 1) had no photo; photo attached unchanged.",
  photo_path: path, sha256, photo_verified: true, other_fields_preserved: true,
};
save("verification", result);
console.log(JSON.stringify(result, null, 2));
