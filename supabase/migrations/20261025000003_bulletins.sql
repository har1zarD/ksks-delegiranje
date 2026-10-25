-- Sačuvani bilteni (korisnik, 2026-10-25): admin piše bilten, sačuva ga i kasnije otvara i prepravlja.
-- Čuva se stanje bildera (izbor takmičenja i kola, utakmice, primjedbe, komesar i sudije, odluke, dijelovi, zaglavlje);
-- PDF i Word se uvijek prave iz njega i podataka iz baze. Broj, naslov, takmičenja i kolo su i u kolonama, za listu.
create table public.bulletins (
  id uuid primary key default gen_random_uuid(),
  number text not null default '',
  title text not null,
  competition_ids uuid[] not null default '{}',
  round integer,
  state jsonb not null,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bulletins_updated_at on public.bulletins (updated_at desc);

alter table public.bulletins enable row level security;
create policy "bulletins_admin" on public.bulletins for all to authenticated using (public.is_admin()) with check (public.is_admin());
