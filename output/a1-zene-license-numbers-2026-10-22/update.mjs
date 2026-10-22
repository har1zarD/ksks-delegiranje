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

const competition_id = "443667aa-44cf-4c3c-9934-5b3d426c8de4"; // A1 liga žene
const before = await (await api(`rest/v1/licenses?select=*&competition_id=eq.${competition_id}`)).json();
const teams = await (await api(`rest/v1/teams?select=name,club_id&competition_id=eq.${competition_id}`)).json();
const teamName = new Map(teams.map(t => [t.club_id, t.name]));
if (before.some(r => !teamName.has(r.club_id))) throw new Error("License for a club without a team in the competition.");
save("licenses-before", before);

// Ekipe abecedno, u ekipi igračice pa službena lica, svako po redoslijedu sa spiska
const kindOrder = { player: 0, official: 1 };
const ordered = [...before].sort((a, b) =>
  teamName.get(a.club_id).localeCompare(teamName.get(b.club_id), "bs") ||
  kindOrder[a.kind] - kindOrder[b.kind] || a.sort - b.sort || a.last_name.localeCompare(b.last_name, "bs"));
const plan = ordered.map((r, i) => ({ id: r.id, team: teamName.get(r.club_id), kind: r.kind, role: r.role, name: `${r.first_name} ${r.last_name}`, from: r.license_no, to: String(i + 1).padStart(3, "0") }));
save("plan", plan);

for (const p of plan) {
  const [row] = await (await api(`rest/v1/licenses?id=eq.${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ license_no: p.to }) })).json();
  if (row?.license_no !== p.to) throw new Error(`Update failed: ${p.name}`);
}

const after = await (await api(`rest/v1/licenses?select=*&competition_id=eq.${competition_id}`)).json();
save("licenses-after", after);
if (after.length !== before.length) throw new Error("Record count changed during update.");
const numbers = after.map(r => r.license_no);
if (new Set(numbers).size !== numbers.length || numbers.some(n => !/^\d{3}$/.test(n))) throw new Error("License numbers are not unique three-digit values.");
for (const r of after) {
  const b = before.find(x => x.id === r.id), p = plan.find(x => x.id === r.id);
  if (!b || !p || r.license_no !== p.to || Object.keys(b).some(k => k !== "license_no" && b[k] !== r[k])) throw new Error(`Unexpected change: ${r.first_name} ${r.last_name}`);
}
const ranges = [...new Set(plan.map(p => p.team))].map(team => {
  const own = plan.filter(p => p.team === team);
  return { team, licenses: own.length, from: own[0].to, to: own.at(-1).to };
});
const result = { verified_at: new Date().toISOString(), competition: "A1 liga žene", total: after.length, unique: true, ranges, replaced: plan.filter(p => p.from).map(p => ({ name: p.name, from: p.from, to: p.to })) };
save("verification", result);
console.log(JSON.stringify({ ...result, replaced: result.replaced.length }, null, 2));
