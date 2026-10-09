-- KSKS — delegiranje sudija i komesara
-- Inicijalna šema. Uloge: admin (savez), official (sudije + pomoćni / zapisnički sto), commissioner.

create extension if not exists "pgcrypto";

-- ───────────────────────── Enums ─────────────────────────
create type public.user_role as enum ('admin', 'official', 'commissioner');

-- Pozicija na utakmici
create type public.assignment_position as enum (
  'referee_1',        -- 1. sudija (crew chief)
  'referee_2',        -- 2. sudija (umpire 1)
  'referee_3',        -- 3. sudija (umpire 2)
  'scorer',           -- zapisničar
  'timer',            -- mjerač vremena
  'shot_clock',       -- operator 24 sekunde
  'commissioner'      -- komesar
);

create type public.assignment_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type public.match_status as enum ('scheduled', 'live', 'finished', 'postponed', 'cancelled');

-- ───────────────────────── Profili ─────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text not null,
  phone       text,
  role        public.user_role not null default 'official',
  -- za role = official: šta osoba može raditi
  is_referee  boolean not null default false,
  is_table    boolean not null default false,
  license     text,                 -- npr. A, B, C, regionalna
  city        text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ───────────────────────── Takmičenja ─────────────────────────
create table public.seasons (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,          -- "2026/27"
  starts_on  date,
  ends_on    date,
  is_current boolean not null default false
);
create unique index seasons_one_current on public.seasons (is_current) where is_current;

create table public.competitions (
  id         uuid primary key default gen_random_uuid(),
  season_id  uuid not null references public.seasons (id) on delete cascade,
  name       text not null,                 -- "Prva liga KS — seniori"
  short_name text,
  category   text not null,                 -- seniori, seniorke, juniori, kadeti, ...
  gender     text not null default 'M' check (gender in ('M', 'Ž')),
  starts_on  date,                          -- planirani početak
  format     text,                          -- sistem takmičenja (opis)
  fee_km     numeric(8,2),                  -- kotizacija po ekipi
  fee_first_km  numeric(8,2),               -- prvi dio kotizacije
  fee_due_on    date,                       -- rok za (prvi dio) uplate
  -- Faze: Liga 4 za prvaka / liga za plasman nastaju iz osnovne lige (parent),
  -- Sistem A iz prvog kruga više liga. carry_over_h2h = prenose se bodovi međusobnih susreta.
  parent_id      uuid references public.competitions (id) on delete set null,
  carry_over_h2h boolean not null default false,
  periods    smallint not null default 4,
  period_min smallint not null default 10,
  sort       smallint not null default 0,
  unique (season_id, name)
);

create table public.halls (
  id       uuid primary key default gen_random_uuid(),
  name     text not null unique,
  address  text,
  city     text
);

create table public.clubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,          -- "KK Ilidža"
  short_name text not null,
  city       text,
  hall_id    uuid references public.halls (id) on delete set null,
  email      text,
  phone      text,
  logo_url   text,
  active     boolean not null default true
);

-- Ekipa kluba u takmičenju. Klub može imati više ekipa u istoj ligi (Realway B, Realway C, Akademija Realway).
create table public.teams (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  club_id        uuid not null references public.clubs (id) on delete cascade,
  name           text not null,             -- naziv kako stoji u takmičenju, npr. "Ilidža Orange"
  sort           smallint not null default 0,
  unique (competition_id, name)
);
create index teams_club on public.teams (club_id);

-- Uplate kotizacije po ekipi
create table public.fee_payments (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  amount_km  numeric(8,2) not null check (amount_km > 0),
  paid_on    date not null default current_date,
  note       text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index fee_payments_team on public.fee_payments (team_id);

-- ───────────────────────── Utakmice ─────────────────────────
create table public.matches (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  round          smallint,
  home_team_id   uuid not null references public.teams (id),
  away_team_id   uuid not null references public.teams (id),
  hall_id        uuid references public.halls (id) on delete set null,
  starts_at      timestamptz not null,
  status         public.match_status not null default 'scheduled',
  referee_count  smallint not null default 2 check (referee_count in (2, 3)), -- 2 ili 3 sudije, zavisi od utakmice
  home_score     smallint,
  away_score     smallint,
  notes          text,
  created_at     timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);
create index matches_starts_at on public.matches (starts_at);

-- Rezultat po četvrtinama (period 5+ = produžeci)
create table public.match_periods (
  match_id    uuid not null references public.matches (id) on delete cascade,
  period      smallint not null check (period between 1 and 12),
  home_points smallint not null default 0 check (home_points >= 0),
  away_points smallint not null default 0 check (away_points >= 0),
  updated_by  uuid references public.profiles (id),
  updated_at  timestamptz not null default now(),
  primary key (match_id, period)
);

-- ───────────────────────── Delegiranja ─────────────────────────
create table public.assignments (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid not null references public.matches (id) on delete cascade,
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  position       public.assignment_position not null,
  status         public.assignment_status not null default 'pending',
  decline_reason text,
  responded_at   timestamptz,
  notified_at    timestamptz,
  created_by     uuid references public.profiles (id),
  created_at     timestamptz not null default now(),
  unique (match_id, position),
  unique (match_id, profile_id)
);
create index assignments_profile on public.assignments (profile_id, status);

-- Naknade po poziciji i takmičenju (KM po utakmici)
create table public.fee_rates (
  competition_id uuid not null references public.competitions (id) on delete cascade,
  position       public.assignment_position not null,
  amount_km      numeric(8,2) not null check (amount_km >= 0),
  primary key (competition_id, position)
);

-- Najave odsustva
create table public.unavailability (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  from_date  date not null,
  to_date    date not null,
  reason     text,
  created_at timestamptz not null default now(),
  check (to_date >= from_date)
);
create index unavailability_profile on public.unavailability (profile_id, from_date);

-- ───────────────────────── Bilten (izvještaj komesara) ─────────────────────────
create table public.match_reports (
  match_id      uuid primary key references public.matches (id) on delete cascade,
  commissioner  uuid references public.profiles (id),
  spectators    integer,
  started_at    time,
  ended_at      time,
  home_fouls    smallint,
  away_fouls    smallint,
  technicals    jsonb not null default '[]',   -- [{team, player, minute, type}]
  incidents     text,
  remarks       text,
  submitted_at  timestamptz,                   -- null = nacrt
  updated_at    timestamptz not null default now()
);

-- Log poslanih emailova
create table public.email_log (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles (id) on delete set null,
  assignment_id uuid references public.assignments (id) on delete set null,
  kind        text not null,       -- nomination, reminder, cancellation, ...
  to_email    text not null,
  provider_id text,
  error       text,
  sent_at     timestamptz not null default now()
);

-- Lični MCP tokeni (svaki profil). Čuva se samo SHA-256 hash; token se prikaže jednom.
create table public.mcp_tokens (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  name         text not null default 'MCP',
  token_hash   text not null unique,
  prefix       text not null,            -- prvih 8 znakova, za prepoznavanje u UI
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index mcp_tokens_profile on public.mcp_tokens (profile_id);

-- Audit svega što se radi preko MCP-a
create table public.mcp_audit (
  id         bigint generated always as identity primary key,
  token_id   uuid references public.mcp_tokens (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  tool       text not null,
  args       jsonb,
  ok         boolean not null,
  error      text,
  at         timestamptz not null default now()
);

-- ───────────────────────── Pomoćne funkcije ─────────────────────────
create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false) $$;

-- Je li trenutni korisnik komesar na utakmici (prihvaćeno delegiranje)
create or replace function public.is_match_commissioner(m uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.assignments
    where match_id = m and profile_id = auth.uid()
      and position = 'commissioner' and status = 'accepted'
  )
$$;

-- Je li trenutni korisnik delegiran na utakmicu (bilo koja pozicija, nije otkazano)
create or replace function public.is_on_match(m uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.assignments
    where match_id = m and profile_id = auth.uid() and status <> 'cancelled'
  )
$$;

-- Sudija/komesar odgovara na nominaciju
create or replace function public.respond_to_assignment(a uuid, accept boolean, reason text default null)
returns public.assignments
language plpgsql security definer set search_path = public
as $$
declare r public.assignments;
begin
  update public.assignments
     set status = case when accept then 'accepted'::assignment_status else 'declined'::assignment_status end,
         decline_reason = case when accept then null else reason end,
         responded_at = now()
   where id = a and profile_id = auth.uid() and status in ('pending', 'accepted')
  returning * into r;
  if r.id is null then raise exception 'Nominacija nije pronađena'; end if;
  return r;
end $$;

-- Ukupni rezultat se računa iz četvrtina
create or replace function public.sync_match_score()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare mid uuid := coalesce(new.match_id, old.match_id);
begin
  update public.matches m
     set home_score = s.h, away_score = s.a
    from (select sum(home_points)::smallint h, sum(away_points)::smallint a
            from public.match_periods where match_id = mid) s
   where m.id = mid;
  return null;
end $$;

create trigger match_periods_sync
after insert or update or delete on public.match_periods
for each row execute function public.sync_match_score();

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles          enable row level security;
alter table public.seasons           enable row level security;
alter table public.competitions      enable row level security;
alter table public.halls             enable row level security;
alter table public.clubs             enable row level security;
alter table public.teams             enable row level security;
alter table public.fee_payments      enable row level security;
alter table public.fee_rates         enable row level security;
alter table public.matches           enable row level security;
alter table public.match_periods     enable row level security;
alter table public.assignments       enable row level security;
alter table public.unavailability    enable row level security;
alter table public.match_reports     enable row level security;
alter table public.email_log         enable row level security;
alter table public.mcp_tokens        enable row level security;
alter table public.mcp_audit         enable row level security;

-- Svi prijavljeni vide šifarnike i utakmice; samo admin mijenja
do $$
declare t text;
begin
  foreach t in array array['seasons','competitions','halls','clubs','teams','fee_rates','matches','match_periods']
  loop
    execute format('create policy "%1$s_read" on public.%1$s for select to authenticated using (true)', t);
    execute format('create policy "%1$s_admin" on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Komesar unosi četvrtine za svoju utakmicu
create policy "match_periods_commissioner" on public.match_periods
  for all to authenticated
  using (public.is_match_commissioner(match_id))
  with check (public.is_match_commissioner(match_id));

-- Profili: svi prijavljeni vide imena (za listu ekipe na utakmici); svoj profil može uređivati osnovno
create policy "profiles_read" on public.profiles for select to authenticated using (true);
create policy "profiles_admin" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Delegiranja: svako vidi svoja + delegiranja na utakmicama gdje je delegiran; admin sve
create policy "assignments_read" on public.assignments for select to authenticated
  using (
    public.is_admin()
    or profile_id = auth.uid()
    or public.is_on_match(match_id)
  );
create policy "assignments_admin" on public.assignments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- odgovor na nominaciju ide kroz respond_to_assignment()

-- Odsustva: vlastita + admin
create policy "unavailability_own" on public.unavailability for all to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- Bilten: admin sve; komesar svoje utakmice; delegirani čitaju
create policy "reports_admin" on public.match_reports for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "reports_commissioner" on public.match_reports for all to authenticated
  using (public.is_match_commissioner(match_id))
  with check (public.is_match_commissioner(match_id) and commissioner = auth.uid());
create policy "reports_read" on public.match_reports for select to authenticated
  using (public.is_on_match(match_id));

-- MCP tokeni: korisnik vidi i opoziva svoje (kreiranje ide preko servera); audit vidi admin
create policy "mcp_tokens_own_read" on public.mcp_tokens for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
create policy "mcp_tokens_own_revoke" on public.mcp_tokens for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());
create policy "mcp_audit_admin" on public.mcp_audit for select to authenticated using (public.is_admin());

create policy "fee_payments_admin" on public.fee_payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "email_log_admin" on public.email_log for select to authenticated using (public.is_admin());

-- Realtime za live rezultat
alter publication supabase_realtime add table public.match_periods, public.matches, public.assignments;
