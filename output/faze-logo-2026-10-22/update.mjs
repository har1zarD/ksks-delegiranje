import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
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

const club_id = "24292426-bf56-4824-8578-d3addfdd5fdb";
const oldUrl = `${base}/storage/v1/object/public/club-logos/2026-10-15/club-additions/${club_id}.png`;
const path = `2026-10-22/${club_id}.png`;
const logo_url = `${base}/storage/v1/object/public/club-logos/${path}`;
const bytes = readFileSync(`${dir}faze-logo.png`), sha256 = createHash("sha256").update(bytes).digest("hex");

const [before] = await (await api(`rest/v1/clubs?select=*&id=eq.${club_id}`)).json();
if (!before || before.name !== "ŽKK Faze" || before.logo_url !== oldUrl) throw new Error("Club differs from expected state.");
save("club-before", before);

save("upload", await (await api(`storage/v1/object/club-logos/${path}`, { method: "POST", headers: { "Content-Type": "image/png" }, body: bytes })).json());
save("update-result", await (await api(`rest/v1/clubs?id=eq.${club_id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ logo_url }) })).json());

const [after] = await (await api(`rest/v1/clubs?select=*&id=eq.${club_id}`)).json();
save("club-after", after);
if (after.logo_url !== logo_url) throw new Error("Logo URL not updated.");
if (Object.keys(before).some(k => k !== "logo_url" && before[k] !== after[k])) throw new Error("Other club fields changed.");
const res = await fetch(logo_url);
const served = Buffer.from(await res.arrayBuffer());
if (!res.ok || createHash("sha256").update(served).digest("hex") !== sha256) throw new Error("Public logo differs.");
const result = { verified_at: new Date().toISOString(), club: after.name, old_logo_url: oldUrl, logo_url, sha256, public_image_verified: true, other_club_fields_preserved: true };
save("verification", result);
console.log(JSON.stringify(result, null, 2));
