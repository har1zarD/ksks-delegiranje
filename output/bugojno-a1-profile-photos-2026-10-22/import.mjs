import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Bugojno-profilne";
const processedDir = `${dir}processed`;
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
const club_id = "03d4df12-f427-4cda-91a3-201fd805f45c", competition_id = "443667aa-44cf-4c3c-9934-5b3d426c8de4";
// slika → osobe u bazi (kind, ime prezime[, funkcija])
const mapping = [
  ["ASJA.jpg", [["player", "Asja Hasanbegović"]]],
  ["Ilhana.jpg", [["player", "Ilhana Hadžić"]]],
  ["23946.jpg", [["player", "Belma Arnautović"]]],
  ["ILMA.jpg", [["player", "Ilma Gulamić"]]],
  ["LENA.jpg", [["player", "Lena Zeljko"]]],
  ["MONIKA.jpg", [["player", "Monika Šafradin"]]],
  ["NEJLA.jpg", [["player", "Nejla Mujčić"]]],
  ["NIKOL.jpg", [["player", "Nikol Peša"]]],
  ["NAIDA.jpg", [["player", "Naida Rejan"]]],
  ["TAJRA.jpg", [["player", "Tajra Jašarević"]]],
  ["Lejla.jpg", [["player", "Lejla Mešan"]]],
  ["MARIJA.jpg", [["player", "Marija Bojanić"]]],
  ["RAHELA.jpg", [["player", "Rahela Porča"]]],
  ["AMRA.jpg", [["player", "Amra Hurić"]]],
  ["SAJRA.jpg", [["player", "Sajra Baručija"]]],
  ["SARAH.jpg", [["player", "Sarah Mešinović"]]],
  ["AJLA.jpg", [["player", "Ajla Čatić"]]],
  ["AMELISA.jpg", [["player", "Amelisa Karagić"]]],
  ["AMINA.jpg", [["player", "Amina Ajkić"]]],
  ["SAJRA Hakanović.jpg", [["player", "Sajra Hakanović"]]],
  ["LEJLA SADIKOVIĆ.jpg", [["player", "Lejla Sadiković"]]],
  ["ZAIM.jpg", [["official", "Zaim Zajmović", "Trener"]]],
  ["IZET.jpg", [["official", "Izet Kelić", "Trener"]]],
  ["MIRO.jpg", [["official", "Miro Dražić", "Trener"]]],
  ["MERSED.jpg", [["official", "Mersed Mešan", "Ljekar"], ["official", "Mersed Mešan", "Službeno lice"]]],
  ["MIRZA.jpg", [["official", "Mirza Ćatić", "Službeno lice"]]],
  ["DRAGAN.jpg", [["official", "Dragan Mučibabić", "Službeno lice"]]],
  ["ADILA.jpg", [["official", "Adila Ganić", "Službeno lice"]]],
];
const findFile = (folder, file) => existsSync(folder) && readdirSync(folder).map(f => `${folder}/${f}`).find(p => p.normalize("NFC").endsWith(`/${file.normalize("NFC")}`));
const mode = process.argv[2];

if (mode === "--prepare") {
  if (existsSync(`${dir}manifest.json`)) throw new Error("Already prepared.");
  const before = await (await api(`rest/v1/licenses?select=id,kind,role,first_name,last_name,photo_path&club_id=eq.${club_id}&competition_id=eq.${competition_id}&order=kind,sort`)).json();
  save("licenses-before", before);
  const sourceFiles = readdirSync(sourceDir).map(f => f.normalize("NFC"));
  const mapped = mapping.map(m => m[0].normalize("NFC"));
  const unmapped = sourceFiles.filter(f => !mapped.includes(f));
  if (unmapped.length !== 1 || unmapped[0] !== "AJRA.jpg" || mapped.some(f => !sourceFiles.includes(f))) throw new Error(`Photo mapping mismatch: ${unmapped}`);
  const photos = mapping.map(([file, people], i) => {
    const rows = people.map(([kind, person, role]) => {
      const hits = before.filter(r => r.kind === kind && `${r.first_name} ${r.last_name}` === person && (role ?? null) === (kind === "official" ? r.role : null));
      if (hits.length !== 1) throw new Error(`License not found: ${person} ${role ?? ""}`);
      return hits[0];
    });
    const original = findFile(sourceDir, file);
    const source = findFile(processedDir, file) || original;
    const bytes = readFileSync(source);
    if (bytes.length > 5242880) throw new Error(`Photo exceeds storage limit: ${file}`);
    return {
      index: i + 1, file, original, source, edited: source !== original,
      original_sha256: hash(readFileSync(original)), sha256: hash(bytes), size: bytes.length, content_type: "image/jpeg",
      path: `${club_id}/bugojno-2026-27-${randomUUID()}.jpg`,
      licenses: rows.map(r => ({ id: r.id, person: `${r.first_name} ${r.last_name}`, role: r.role, previous_photo_path: r.photo_path })),
    };
  });
  save("manifest", {
    status: "prepared", club: "KK Bugojno", competition: "A1 liga žene", season: "2026/27", club_id, competition_id,
    source: "10 emails \"FW: foto\" from bugojnobhn@gmail.com, 2026-10-21 19:29–19:40, forwarded by KSKS", photos,
    notes: [
      "New profile photos without burned-in names replace the current license photos at the user's request; old storage objects are kept.",
      "23946.jpg (Belma Arnautović) still had the caption; cropped above it.",
      "ZAIM.jpg is a photo of an ID document; cropped to the portrait (watermark and redaction bars removed).",
      "SAJRA.jpg (Sajra Baručija) is a photographed print on a red background; cropped to the print.",
      "DRAGAN, IZET, MERSED and LEJLA SADIKOVIĆ exceeded the 5 MiB storage limit; re-encoded as JPEG q92 at original dimensions.",
      "MERSED.jpg used on both Mersed Mešan licenses (Ljekar and Službeno lice).",
      "AJRA.jpg not used: Ajra Karagić has no license yet (roster entry with birth details not received).",
      "Enes Trapo (Fizioterapeut): no photo sent; remains without one.",
    ],
  });
  console.log(photos.map(p => `${p.file}${p.edited ? " (edited)" : ""} -> ${p.licenses.map(l => l.person + (l.role ? ` (${l.role})` : "")).join(", ")}`).join("\n"));
} else if (mode === "--import") {
  const manifest = read("manifest");
  if (manifest.status !== "prepared") throw new Error("Not in prepared state.");
  for (const p of manifest.photos) {
    const res = await api(`storage/v1/object/licenses/${p.path}`, { method: "POST", headers: { "Content-Type": p.content_type }, body: readFileSync(p.source) });
    save(`upload-${p.index}`, await res.json());
  }
  const results = [];
  for (const p of manifest.photos) for (const l of p.licenses) {
    const filter = l.previous_photo_path ? `photo_path=eq.${l.previous_photo_path}` : "photo_path=is.null";
    const res = await api(`rest/v1/licenses?id=eq.${l.id}&${filter}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ photo_path: p.path }) });
    const rows = await res.json();
    if (rows.length !== 1) throw new Error(`License not updated: ${l.person}`);
    results.push(rows[0]);
  }
  save("licenses-update-result", results);
  manifest.status = "imported";
  save("manifest", manifest);
  console.log(`Uploaded ${manifest.photos.length} photos, updated ${results.length} licenses.`);
} else if (mode === "--verify") {
  const manifest = read("manifest");
  const after = await (await api(`rest/v1/licenses?select=*&club_id=eq.${club_id}&competition_id=eq.${competition_id}&order=kind,sort`)).json();
  save("licenses-after", after);
  mkdirSync(`${dir}downloaded`, { recursive: true });
  for (const p of manifest.photos) {
    for (const l of p.licenses) if (after.find(r => r.id === l.id)?.photo_path !== p.path) throw new Error(`Photo path mismatch: ${l.person}`);
    const bytes = Buffer.from(await (await api(`storage/v1/object/authenticated/licenses/${p.path}`)).arrayBuffer());
    writeFileSync(`${dir}downloaded/${p.index}.jpg`, bytes);
    if (hash(bytes) !== p.sha256) throw new Error(`Stored photo differs: ${p.file}`);
  }
  const result = {
    verified_at: new Date().toISOString(), photos_verified: manifest.photos.length,
    licenses_updated: manifest.photos.reduce((n, p) => n + p.licenses.length, 0),
    without_photo: after.filter(r => !r.photo_path).map(r => `${r.first_name} ${r.last_name}`),
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --import or --verify.");
}
