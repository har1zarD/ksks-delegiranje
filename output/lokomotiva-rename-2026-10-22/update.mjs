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

const id = "1d06ba2c-c999-4e14-b256-f41a7c5bcd07";
const changes = { name: "KK Lokomotiva", short_name: "Lokomotiva" };
const [before] = await (await api(`rest/v1/clubs?select=*&id=eq.${id}`)).json();
if (!before || before.name !== "KK Lokomotiva J&A" || before.short_name !== "Lokomotiva J&A") throw new Error("Club differs from expected state.");
const clash = await (await api(`rest/v1/clubs?select=id&name=eq.${encodeURIComponent(changes.name)}`)).json();
if (clash.length) throw new Error("Another club already uses this name.");
save("club-before", before);
await api(`rest/v1/clubs?id=eq.${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
const [after] = await (await api(`rest/v1/clubs?select=*&id=eq.${id}`)).json();
save("club-after", after);
if (Object.keys(before).some(k => (k in changes ? after[k] !== changes[k] : after[k] !== before[k]))) throw new Error("Update mismatch.");
const left = await (await api(`rest/v1/clubs?select=id,name,short_name&or=(name.ilike.*J%26A*,short_name.ilike.*J%26A*)`)).json();
const teams = await (await api(`rest/v1/teams?select=id,name&name=ilike.*J%26A*`)).json();
const result = { verified_at: new Date().toISOString(), from: { name: before.name, short_name: before.short_name }, to: changes, remaining_JA_clubs: left.length, remaining_JA_teams: teams.length, other_fields_preserved: true };
save("verification", result);
console.log(JSON.stringify(result, null, 2));
