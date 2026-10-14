-- Sastav ekipe po utakmici; seniori s odvojenim nominacijama sudija i pomoćnih sudija.
--  * Nove pozicije: pomoćni zapisničar, statistika (do 2 osobe)
--  * Utakmica sama nosi sastav: sudije da/ne (2/3), komesar, zapisnik, pom. zapisnik, glavno vrijeme, 24/14, statistika 0–2, digitalni zapisnik
--    (seniori: sudije + komesar i pomoćne sudije (sto) su dvije odvojene nominacije; omladinska liga sve zajedno)
--  * Takmičenje daje podrazumijevani sastav i cijenu statistike
--  * Broj utakmice se broji po takmičenju (kao u nominacijama saveza)
--  * Seniorska takmičenja i dvorane iz nominacija

alter type public.assignment_position add value if not exists 'assistant_scorer' after 'scorer';
alter type public.assignment_position add value if not exists 'statistician_1' after 'shot_clock';
alter type public.assignment_position add value if not exists 'statistician_2' after 'statistician_1';

-- ───────── Sastav na utakmici ─────────
alter table public.matches
  add column has_commissioner     boolean not null default true,
  add column has_scorer           boolean not null default true,
  add column has_assistant_scorer boolean not null default false,
  add column has_timer            boolean not null default true,
  add column has_shot_clock       boolean not null default false,
  add column stats_count          smallint not null default 0 check (stats_count between 0 and 2),
  add column digital_scoresheet   boolean not null default false;
update public.matches set has_shot_clock = true where table_count = 3;
-- Utakmica bez sudija (KSKS delegira samo sto): referee_count ostaje 2/3, has_referees = false
alter table public.matches add column has_referees boolean not null default true;

-- ───────── Podrazumijevani sastav i cijena statistike na takmičenju ─────────
alter table public.competitions
  add column commissioner_default     boolean not null default true,
  add column scorer_default           boolean not null default true,
  add column assistant_scorer_default boolean not null default false,
  add column timer_default            boolean not null default true,
  add column shot_clock_default       boolean not null default false,
  add column stats_default            smallint not null default 0 check (stats_default between 0 and 2),
  add column digital_default          boolean not null default false,
  add column fee_stats_km             numeric(8,2) check (fee_stats_km >= 0),
  -- Seniori: sudije/komesar i pomoćne sudije (sto) su dvije odvojene nominacije; omladinska ide zajedno
  add column split_nominations        boolean not null default false;
update public.competitions set shot_clock_default = true where table_count_default = 3;
alter table public.competitions add column referees_default boolean not null default true;

-- ───────── Broj utakmice po takmičenju ─────────
-- Okidač matches_number ostaje; funkcija sada samo dodjeljuje sljedeći slobodan, a duplikat odbija ograničenje
create or replace function public.assign_match_number()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.number is null then
    perform pg_advisory_xact_lock(hashtext('match_number:' || new.competition_id::text));
    select coalesce(max(number), 0) + 1 into new.number from public.matches where competition_id = new.competition_id;
  end if;
  return new;
end $$;

update public.matches m
   set number = n.rn
  from (select id, row_number() over (partition by competition_id order by starts_at, created_at) as rn from public.matches) n
 where n.id = m.id;

alter table public.matches add constraint matches_competition_number unique (competition_id, number);

-- ───────── Seniorska takmičenja ─────────
-- Puni sastav (3 sudije, komesar, sto sa 24/14 i statistikom), nominacije sudija i stola odvojeno
insert into public.competitions
  (season_id, name, short_name, category, gender, sort, split_nominations,
   referee_count_default, commissioner_default, scorer_default, timer_default, shot_clock_default, stats_default, table_count_default)
select s.id, v.name, v.short_name, case when v.gender = 'Ž' then 'seniorke' else 'seniori' end, v.gender, v.sort, true, 3, true, true, true, true, 1, 3
  from public.seasons s
 cross join (values
   ('Premijer liga BiH', 'Premijer liga', 'M', 101),
   ('A1 liga KSBiH',     'A1 liga',       'M', 102),
   ('A2 liga jug KSBiH', 'A2 liga jug',   'M', 103),
   ('Prva liga FBiH',    '1. liga FBiH',  'M', 104),
   ('Liga KS',           'Liga KS',       'M', 105),
   ('Ženska liga',       'Ženska liga',   'Ž', 106)
 ) as v(name, short_name, gender, sort)
 where s.is_current
   and not exists (select 1 from public.competitions c where c.season_id = s.id and c.name = v.name);

-- ───────── Dvorane iz nominacija ─────────
insert into public.halls (name, city)
select v.name, v.city
  from (values
    ('SD Skenderija', 'Sarajevo'),
    ('SD Zetra', 'Sarajevo'),
    ('KSC Sabit Hadžić', 'Sarajevo'),
    ('SD Goran Čengić', 'Sarajevo'),
    ('SD Ilijaš', 'Ilijaš'),
    ('SD Amel Bečković', 'Vogošća'),
    ('KŠC Otoka', 'Sarajevo'),
    ('SD Umihana Čuvidina', 'Sarajevo')
  ) as v(name, city)
 where not exists (select 1 from public.halls h where h.name = v.name);

-- ───────── Seniorski klubovi i ekipe (iz nominacija A1 lige 2026/27 i A2 lige jug) ─────────
-- Klubovi koji već postoje (omladinska liga) se ne dupliraju: Bošnjak, Ilidža, Spars, Realway, GEN, Mladost, Igman
insert into public.clubs (name, short_name)
select 'KK ' || v.short, v.short
  from (values ('Konjic'), ('Željo 1971'), ('IUS-Famos'), ('Bosna'), ('Gradina Srebrenik'), ('Živinice'), ('Travnik'),
               ('Turbina'), ('Vogošća'), ('Kakanj'), ('Gradačac'), ('Čelik'), ('Vukovi'), ('Orlovik'), ('Never Stop'),
               ('Radnički'), ('Lokomotiva J&A'),
               -- samo klub, ekipa se dodaje u ligu kad zatreba
               ('Play Off'), ('Zenica'), ('Studenti'), ('Gradina Tešanj')) as v(short)
 where not exists (select 1 from public.clubs c where c.short_name = v.short);

insert into public.teams (competition_id, club_id, name, sort)
select comp.id, club.id, v.team, v.sort
  from (values
    ('A1 liga KSBiH', 'Konjic', 'Konjic', 1),
    ('A1 liga KSBiH', 'Željo 1971', 'Željo 1971', 2),
    ('A1 liga KSBiH', 'IUS-Famos', 'IUS-Famos', 3),
    ('A1 liga KSBiH', 'Bosna', 'Bosna Spars', 4),
    ('A1 liga KSBiH', 'Gradina Srebrenik', 'Gradina Srebrenik', 5),
    ('A1 liga KSBiH', 'Živinice', 'Živinice', 6),
    ('A1 liga KSBiH', 'Travnik', 'Travnik', 7),
    ('A1 liga KSBiH', 'Bošnjak', 'Bošnjak', 8),
    ('A1 liga KSBiH', 'Turbina', 'Turbina', 9),
    ('A1 liga KSBiH', 'Vogošća', 'Vogošća', 10),
    ('A1 liga KSBiH', 'Kakanj', 'Kakanj', 11),
    ('A1 liga KSBiH', 'Gradačac', 'Gradačac', 12),
    ('A1 liga KSBiH', 'Čelik', 'Čelik', 13),
    ('A2 liga jug KSBiH', 'Vukovi', 'Vukovi', 1),
    ('A2 liga jug KSBiH', 'Mladost', 'Mladost', 2),
    ('A2 liga jug KSBiH', 'Orlovik', 'Orlovik Junior', 3),
    ('A2 liga jug KSBiH', 'Never Stop', 'Never Stop', 4),
    ('A2 liga jug KSBiH', 'Spars', 'Spars No 1 Academy', 5),
    ('A2 liga jug KSBiH', 'GEN', 'Gen-Star', 6),
    ('A2 liga jug KSBiH', 'Ilidža', 'Ilidža', 7),
    ('A2 liga jug KSBiH', 'Realway', 'Real Way', 8),
    ('A2 liga jug KSBiH', 'Radnički', 'Radnički', 9),
    ('A2 liga jug KSBiH', 'Lokomotiva J&A', 'Lokomotiva J&A', 10)
  ) as v(comp, club, team, sort)
  join public.competitions comp on comp.name = v.comp
  join public.seasons s on s.id = comp.season_id and s.is_current
  join public.clubs club on club.short_name = v.club
 where not exists (select 1 from public.teams t where t.competition_id = comp.id and t.name = v.team);
