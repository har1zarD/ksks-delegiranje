-- Sačuvani rasporedi za "Slike za objavu" (korisnik, 2026-11-07): admin pravi raspored utakmica za sliku
-- (ručno dodane i potvrđene iz zvaničnog rasporeda saveza), sačuva ga i kasnije nastavlja, i sa drugog uređaja,
-- prije nego preuzme PNG. Čuva se stanje bildera (izabrane i ručno dodane/uređene utakmice, filteri, tekst, izgled).
create table public.social_schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  state jsonb not null,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index social_schedules_updated_at on public.social_schedules (updated_at desc);

alter table public.social_schedules enable row level security;
create policy "social_schedules_admin" on public.social_schedules for all to authenticated using (public.is_admin()) with check (public.is_admin());
