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

const club_id = "24292426-bf56-4824-8578-d3addfdd5fdb";
const toCode = { "Playmaker": "PG", "Bek šuter": "SG", "Bek": "SG", "Krilni bek": "SG", "Krilo": "SF", "Centar": "C" };
// [id, ime, prezime, pozicija od trenerice (mail 21.10.2026)]
const players = [
  ["5b4595a8-47a9-49b7-b524-e20884fff2a1", "Najda", "Njemčević", "Krilo"],
  ["8a500c54-29d6-4582-9d3c-e106075cd0d2", "Hanadi", "Jašarević", "Bek"],
  ["b83fd3d4-0649-4e25-a364-a89b9fedf8fd", "Ajla", "Kukuljac", "Krilo"],
  ["86f2a7c7-2a6a-4758-8ab1-fb5920bd4af4", "Azra", "Dautbegović", "Krilo"],
  ["c41fe3d9-7e67-4fe5-b118-2d6c3659bd11", "Lamija", "Buljugić", "Krilni bek"],
  ["7bb95bba-483f-41b1-96bd-25965a3315c6", "Ilma", "Likić", "Centar"],
  ["1a63d88c-a8b0-4d69-bf68-2521403ddeff", "Esma", "Alijagić", "Krilo"],
  ["46d9ec35-b756-440d-bbfc-5ea431285775", "Sara", "Jašić", "Bek"],
  ["47a29ce3-5afa-4b62-8080-dd0be7587648", "Ejla", "Hrgić", "Bek šuter"],
  ["1c99131a-d959-4e98-93fa-fe93f38ec539", "Amna", "Balta", "Playmaker"],
  ["3794e68b-3895-4c17-8298-a66d54faeaea", "Uma", "Pita", "Playmaker"],
  ["ab6c2647-1327-458e-a0a0-6c733cebc18b", "Nejra", "Ajanović", "Krilo"],
  ["7453c344-5116-4495-83cf-f58e68feed4f", "Una", "Avdić", "Bek šuter"],
  ["351a6fd8-bfea-4b73-b49e-28cf348e61b0", "Tayra", "Kočo", "Krilni bek"],
];
const coachId = "7b240984-ed2d-479e-b469-420d1278071d";
const ids = [...players.map(p => p[0]), coachId];

const before = await (await api(`rest/v1/licenses?select=*&id=in.(${ids})`)).json();
if (before.length !== ids.length || before.some(r => r.club_id !== club_id)) throw new Error("Records differ from expected state.");
for (const [id, first, last] of players) {
  const r = before.find(b => b.id === id);
  if (r.kind !== "player" || r.first_name !== first || r.last_name !== last) throw new Error(`Player mismatch: ${first} ${last}`);
}
const coach = before.find(b => b.id === coachId);
if (coach.first_name !== "Amir" || coach.last_name !== "Aljilji") throw new Error("Coach mismatch.");
save("licenses-before", before);

const changes = [];
for (const [id, first, last, label] of players) {
  const position = toCode[label];
  const [row] = await (await api(`rest/v1/licenses?id=eq.${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ position }) })).json();
  changes.push({ person: `${first} ${last}`, from: before.find(b => b.id === id).position, coach_label: label, to: row.position });
}
await api(`rest/v1/licenses?id=eq.${coachId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ last_name: "Aljiji" }) });
changes.push({ person: "Amir Aljilji", field: "last_name", from: "Aljilji", to: "Aljiji" });
save("changes", changes);

const after = await (await api(`rest/v1/licenses?select=*&id=in.(${ids})`)).json();
save("licenses-after", after);
for (const r of after) {
  const b = before.find(x => x.id === r.id);
  const changed = Object.keys(b).filter(k => b[k] !== r[k]);
  const expected = r.id === coachId ? ["last_name"] : (b.position === r.position ? [] : ["position"]);
  if (changed.join() !== expected.join()) throw new Error(`Unexpected change on ${r.first_name} ${r.last_name}: ${changed}`);
  if (r.id === coachId ? r.last_name !== "Aljiji" : r.position !== toCode[players.find(p => p[0] === r.id)[3]]) throw new Error(`Value mismatch: ${r.first_name}`);
}
const result = { verified_at: new Date().toISOString(), club: "ŽKK Faze", competition: "A1 liga žene", positions_updated: players.length, coach_renamed: "Amir Aljiji", mapping: toCode, all_fields_match: true };
save("verification", result);
console.log(JSON.stringify({ ...result, changes }, null, 2));
