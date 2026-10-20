-- FIBA LiveStats (Genius Sports): utakmice drugih saveza i liga koje se vode na FIBA LiveStats, uživo u aplikaciji.
-- Izvor je javan: fibalivestats.dcd.shared.geniussports.com/data/competition/{id}.json (zadnje i žive utakmice takmičenja)
-- i /data/{matchId}/data.json (cijela utakmica). Spisak utakmica se puni sam iz feeda takmičenja; admin dodaje i FIBA linkom.

create table public.fiba_competitions (
  id     integer primary key, -- FIBA competitionId
  name   text not null,
  sort   smallint not null default 0,
  active boolean not null default true
);

create table public.fiba_games (
  id             bigint primary key, -- FIBA matchId (fibalivestats …/u/BIH/{matchId}/)
  competition_id integer references public.fiba_competitions (id) on delete set null,
  starts_at      timestamptz,
  status         text not null default 'SCHEDULED', -- SCHEDULED, IN_PROGRESS, COMPLETE, …
  live           boolean not null default false,
  home_name      text not null,
  away_name      text not null,
  home_logo      text,
  away_logo      text,
  home_score     smallint,
  away_score     smallint,
  -- Kasnije: povezivanje s našom utakmicom
  match_id       uuid unique references public.matches (id) on delete set null,
  updated_at     timestamptz not null default now()
);
create index fiba_games_starts_at on public.fiba_games (starts_at desc);

-- Samo servisni klijent; bez politika nema pristupa kroz API
alter table public.fiba_competitions enable row level security;
alter table public.fiba_games enable row level security;

insert into public.fiba_competitions (id, name, sort) values
  (50128, 'Premijer liga BiH', 1),
  (50228, 'Premijer liga BiH — žene', 2),
  (50201, 'A1 liga KSBiH', 3),
  (47523, 'A2 liga KSBiH', 4),
  (47343, 'Liga KSHB', 5),
  (47539, 'RS1 liga', 6),
  (47734, 'RS1 liga — žene', 7),
  (47625, 'KS mlađe kategorije', 8),
  (48712, 'Državna prvenstva mlađih', 9)
on conflict (id) do nothing;
