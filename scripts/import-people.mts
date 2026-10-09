// Uvoz sudija, zapisničkog stola, komesara i admina iz CSV-a.
//   npx tsx scripts/import-people.mts ljudi.csv            (provjera, ništa ne upisuje)
//   npx tsx scripts/import-people.mts ljudi.csv --upisi    (kreira naloge i profile)
// CSV (separator ; ili ,): ime;email;uloga;telefon;licenca
//   uloga: sudija | sto | sudija+sto | komesar | admin
// Postojeći korisnici (isti email) se ažuriraju, šifra im se ne mijenja.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types.ts";

process.loadEnvFile(".env.local");

const [file, flag] = process.argv.slice(2);
if (!file) {
  console.error("Upotreba: npx tsx scripts/import-people.mts <ljudi.csv> [--upisi]");
  process.exit(1);
}
const write = flag === "--upisi";

type Profile = Database["public"]["Tables"]["profiles"]["Insert"];

const ROLES: Record<string, Pick<Profile, "role" | "is_referee" | "is_table">> = {
  sudija: { role: "official", is_referee: true, is_table: false },
  sto: { role: "official", is_referee: false, is_table: true },
  "sudija+sto": { role: "official", is_referee: true, is_table: true },
  komesar: { role: "commissioner", is_referee: false, is_table: false },
  admin: { role: "admin", is_referee: false, is_table: false },
};

const text = readFileSync(file, "utf8").replace(/^﻿/, "");
const lines = text.split(/\r?\n/).filter((l) => l.trim());
const sep = lines[0].includes(";") ? ";" : ",";
// Zaglavlje je opcionalno
const rows = /email/i.test(lines[0]) ? lines.slice(1) : lines;

const people: Omit<Profile, "id">[] = [];
const errors: string[] = [];
rows.forEach((line, i) => {
  const [full_name, email, role, phone, license] = line.split(sep).map((c) => c.trim());
  const r = ROLES[(role ?? "").toLowerCase()];
  if (!full_name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email ?? "") || !r) {
    errors.push(`Red ${i + 1}: "${line}"`);
    return;
  }
  people.push({ full_name, email: email.toLowerCase(), phone: phone || null, license: license || null, ...r });
});

const dupes = people.map((p) => p.email).filter((e, i, all) => all.indexOf(e) !== i);
if (dupes.length) errors.push(`Dupli emailovi: ${[...new Set(dupes)].join(", ")}`);

for (const p of people) console.log(`${p.full_name} <${p.email}> — ${p.role}${p.is_referee ? " sudija" : ""}${p.is_table ? " sto" : ""}`);
if (errors.length) {
  console.error(`\nNeispravni redovi:\n${errors.join("\n")}`);
  process.exit(1);
}
if (!write) {
  console.log(`\n${people.length} osoba je ispravno. Pokreni s --upisi za upis.`);
  process.exit(0);
}

const password = process.env.INITIAL_PASSWORD;
if (!password) throw new Error("INITIAL_PASSWORD nije podešen u .env.local");
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});

// Postojeći nalozi po emailu
const existing = new Map<string, string>();
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  for (const u of data.users) if (u.email) existing.set(u.email.toLowerCase(), u.id);
  if (data.users.length < 1000) break;
}

let created = 0;
let updated = 0;
for (const p of people) {
  let id = existing.get(p.email);
  if (!id) {
    const { data, error } = await supabase.auth.admin.createUser({ email: p.email, password, email_confirm: true });
    if (error) {
      console.error(`✗ ${p.email}: ${error.message}`);
      continue;
    }
    id = data.user.id;
    created++;
  } else {
    updated++;
  }
  const { error } = await supabase.from("profiles").upsert({ id, ...p });
  if (error) console.error(`✗ profil ${p.email}: ${error.message}`);
}
console.log(`\nKreirano: ${created}, ažurirano: ${updated}`);
