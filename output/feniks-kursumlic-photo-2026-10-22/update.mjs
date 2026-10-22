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
const id = "4e52484b-fe76-42d7-9f40-47adb07b6049";
const bytes = readFileSync(`${dir}edin-kursumlic.jpg`), sha256 = createHash("sha256").update(bytes).digest("hex");

const [before] = await (await api(`rest/v1/licenses?select=*&id=eq.${id}`)).json();
if (!before || before.last_name !== "Kuršumlić" || before.kind !== "official" || before.club_id !== club_id || before.photo_path !== null) throw new Error("License differs from expected state.");
save("license-before", before);

const path = `${club_id}/feniks-pioniri-2026-27-${randomUUID()}.jpg`;
save("upload", await (await api(`storage/v1/object/licenses/${path}`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: bytes })).json());
save("update-result", await (await api(`rest/v1/licenses?id=eq.${id}&photo_path=is.null`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ photo_path: path }) })).json());

const [after] = await (await api(`rest/v1/licenses?select=*&id=eq.${id}`)).json();
save("license-after", after);
if (after.photo_path !== path || Object.keys(before).some(k => k !== "photo_path" && before[k] !== after[k])) throw new Error("Update mismatch.");
const stored = Buffer.from(await (await api(`storage/v1/object/authenticated/licenses/${path}`)).arrayBuffer());
if (createHash("sha256").update(stored).digest("hex") !== sha256) throw new Error("Stored photo differs.");
const result = {
  verified_at: new Date().toISOString(), person: `${after.first_name} ${after.last_name}`, club: "KK Feniks", competition: "Pioniri — Grupa 1",
  source: "/Users/tarikvelic/Documents/ViberDownloads/0-02-05-119ef5455a9eb466a8d300f56b9246085764c1f8f2e07bb8a4d8b91c5e35e27e_22a35a37d96.jpg",
  note: "Selfie screenshot; black bars removed and cropped to 4:5 (681x851 px), no resizing; role left unchanged.",
  photo_path: path, sha256, photo_verified: true, other_fields_preserved: true,
};
save("verification", result);
console.log(JSON.stringify(result, null, 2));
