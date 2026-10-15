"use server";

import { requireRole, type Role } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { TABLE_SKILLS } from "@/lib/crew";

const TABLE_SKILL_KEYS = TABLE_SKILLS.map((s) => s.key);
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PersonState = { error?: string; ok?: number };

const ROLES: Role[] = ["official", "commissioner", "admin"];

function readPerson(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const role = get("role") as Role;
  const isOfficial = role === "official";
  return {
    full_name: get("full_name"),
    email: get("email").toLowerCase(),
    phone: get("phone") || null,
    license: get("license") || null,
    role,
    // Sudija/sto ima smisla samo za ulogu official
    is_referee: isOfficial && formData.get("is_referee") === "on",
    is_table: isOfficial && formData.get("is_table") === "on",
    // Komesar kao oznaka samo za admina; uloga commissioner je komesar sama po sebi
    is_commissioner: role === "admin" && formData.get("is_commissioner") === "on",
    // Šta zna za stolom; bez polja (npr. nije označen sto) ostaju sve vještine
    table_skills: formData.has("table_skills")
      ? formData.getAll("table_skills").map(String).filter((s) => (TABLE_SKILL_KEYS as string[]).includes(s))
      : [...TABLE_SKILL_KEYS],
  };
}

function validate(p: ReturnType<typeof readPerson>, { checkEmail = true } = {}) {
  if (!p.full_name) return "Upiši ime i prezime.";
  if (checkEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) return "Email nije ispravan.";
  if (!ROLES.includes(p.role)) return "Izaberi ulogu.";
  if (p.role === "official" && !p.is_referee && !p.is_table) return "Označi da li je sudija, zapisnički sto ili oboje.";
  if (p.is_table && p.table_skills.length === 0) return "Označi bar jednu poziciju za stolom.";
  return null;
}

export async function addPerson(prev: PersonState, formData: FormData): Promise<PersonState> {
  await requireRole("admin");
  const person = readPerson(formData);
  const invalid = validate(person);
  if (invalid) return { error: invalid };

  const password = process.env.INITIAL_PASSWORD;
  if (!password) return { error: "Početna šifra nije podešena (INITIAL_PASSWORD)." };

  // Nalog u Supabase Auth traži servisni ključ; profil se upisuje istim klijentom
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email: person.email, password, email_confirm: true });
  if (error) {
    return { error: error.code === "email_exists" ? "Korisnik s tim emailom već postoji." : "Nalog nije kreiran. Pokušaj ponovo." };
  }

  const { error: profileError } = await admin.from("profiles").insert({ id: data.user.id, ...person });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "Profil nije sačuvan. Pokušaj ponovo." };
  }

  invalidate("profiles");
  return { ok: (prev.ok ?? 0) + 1 };
}

export async function updatePerson(_prev: PersonState, formData: FormData): Promise<PersonState> {
  const me = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const person = readPerson(formData);
  const invalid = validate(person, { checkEmail: false });
  if (invalid) return { error: invalid };
  if (id === me.id && person.role !== "admin") return { error: "Ne možeš sebi ukloniti admin ulogu." };

  const supabase = await createClient();
  // Email je vezan za Auth nalog i ovdje se ne mijenja
  const { full_name, phone, license, role, is_referee, is_table, is_commissioner, table_skills } = person;
  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone, license, role, is_referee, is_table, is_commissioner, table_skills })
    .eq("id", id);
  if (error) return { error: "Izmjene nisu sačuvane." };

  invalidate("profiles");
  return {};
}

export async function setActive(formData: FormData) {
  const me = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (id === me.id) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ active: formData.get("active") === "1" }).eq("id", id);
  invalidate("profiles");
}
