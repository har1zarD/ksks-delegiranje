import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Bugojno-dopuna";
const read = name => JSON.parse(readFileSync(`${dir}${name}.json`, "utf8"));
const save = (name, value) => writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2) + "\n");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
if (!base || !key) throw new Error("Missing connection configuration.");
const api = async (path, init = {}) => {
  const res = await fetch(`${base}/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, ...init.headers } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res;
};
const club_id = "03d4df12-f427-4cda-91a3-201fd805f45c";
// [license id, osoba u bazi, slika, očekivana postojeća fotografija]
const updates = [
  ["344978f1-5a64-4b94-ad82-f44ff5f6fd37", "Tajra Jašarević", "TAJRA Jašarević.jpg", null],
  ["e22729fc-a640-4ee1-9a56-699a7fa31c13", "Amelisa Karagić", "AMELISA Karagić.jpg", null],
  ["5fa3bbe5-d17b-4cc7-9864-3f886efb3d7b", "Ajla Čatić", "AJLA Ćurić.jpg", null],
  ["410aa0b4-df50-4ba6-bc9e-77d8993bfe0a", "Amina Ajkić", "AMINA Ajkić.jpg", "03d4df12-f427-4cda-91a3-201fd805f45c/bugojno-2026-27-84742bd5-5b38-4e4c-8db5-fd1c32fc0fbc.jpg"],
];
const mode = process.argv[2];

if (mode === "--prepare") {
  if (existsSync(`${dir}manifest.json`)) throw new Error("Already prepared.");
  const ids = updates.map(u => u[0]).join(",");
  const before = await (await api(`rest/v1/licenses?select=id,club_id,first_name,last_name,photo_path&id=in.(${ids})`)).json();
  save("licenses-before", before);
  const files = readdirSync(sourceDir);
  const photos = updates.map(([id, person, file, current], i) => {
    const row = before.find(r => r.id === id);
    if (!row || row.club_id !== club_id || `${row.first_name} ${row.last_name}` !== person || row.photo_path !== current) throw new Error(`License state mismatch: ${person}`);
    const source = files.map(f => `${sourceDir}/${f}`).find(p => p.normalize("NFC").endsWith(`/${file.normalize("NFC")}`));
    if (!source) throw new Error(`Photo missing: ${file}`);
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${person}`);
    return { index: i + 1, license_id: id, person, source, previous_photo_path: current, sha256: hash(bytes), size: bytes.length, content_type: "image/jpeg", path: `${club_id}/bugojno-2026-27-${randomUUID()}.jpg` };
  });
  save("manifest", {
    status: "prepared", club: "KK Bugojno", competition: "A1 liga žene", season: "2026/27", club_id,
    source: "Email \"BHN\" from bugojnobhn@gmail.com, 2026-10-21 12:01, forwarded by KSKS", photos,
    notes: [
      "Missing photos added for Tajra Jašarević, Amelisa Karagić and Ajla Čatić.",
      "Amina Ajkić photo replaced with a newer one at the club's request; the old storage object is kept.",
      "Photo AJLA Ćurić.jpg mapped to Ajla Čatić, the only Ajla on the roster (roster prints Ćatić).",
      "AJRA Karagić.jpg not used: she is a new player (no. 22) whose updated roster and medical were not attached.",
      "Enes Trapo (Fizioterapeut) still has no photograph.",
    ],
  });
  console.log(photos.map(p => `${p.person} <- ${p.source.split("/").pop()}`).join("\n"));
} else if (mode === "--import") {
  const manifest = read("manifest");
  if (manifest.status !== "prepared") throw new Error("Not in prepared state.");
  for (const p of manifest.photos) {
    const res = await api(`storage/v1/object/licenses/${p.path}`, { method: "POST", headers: { "Content-Type": p.content_type }, body: readFileSync(p.source) });
    save(`upload-${p.index}`, await res.json());
  }
  const results = [];
  for (const p of manifest.photos) {
    const filter = p.previous_photo_path ? `photo_path=eq.${p.previous_photo_path}` : "photo_path=is.null";
    const res = await api(`rest/v1/licenses?id=eq.${p.license_id}&${filter}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ photo_path: p.path }) });
    const rows = await res.json();
    if (rows.length !== 1) throw new Error(`License not updated: ${p.person}`);
    results.push(rows[0]);
  }
  save("licenses-update-result", results);
  manifest.status = "imported";
  save("manifest", manifest);
  console.log(`Uploaded and linked ${manifest.photos.length} photos.`);
} else if (mode === "--verify") {
  const manifest = read("manifest");
  const ids = manifest.photos.map(p => p.license_id).join(",");
  const after = await (await api(`rest/v1/licenses?select=*&id=in.(${ids})`)).json();
  save("licenses-after", after);
  for (const p of manifest.photos) {
    if (after.find(r => r.id === p.license_id)?.photo_path !== p.path) throw new Error(`Photo path mismatch: ${p.person}`);
    const bytes = Buffer.from(await (await api(`storage/v1/object/authenticated/licenses/${p.path}`)).arrayBuffer());
    if (hash(bytes) !== p.sha256) throw new Error(`Stored photo differs: ${p.person}`);
  }
  const result = { verified_at: new Date().toISOString(), photos_linked_and_verified: manifest.photos.map(p => p.person) };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --import or --verify.");
}
