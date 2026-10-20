-- Posebna cijena zapisničara (umjesto cijene stola); null = kao sto. Digitalni zapisnik i dalje ima svoju (fee_digital_km).
-- Premijer liga BiH (muškarci): zapisničar 50 KM, običan zapisnik (bez digitalnog kao podrazumijevanog).
alter table public.competitions add column if not exists fee_scorer_km numeric(8,2) check (fee_scorer_km >= 0);

update public.competitions c
   set fee_scorer_km = 50, digital_default = false
  from public.seasons s
 where c.name = 'Premijer liga BiH' and s.id = c.season_id and s.is_current;

-- Utakmice te lige: običan zapisnik; ručna cijena 50 KM postavljena prije pravila više ne treba
update public.matches m
   set digital_scoresheet = false
  from public.competitions c
  join public.seasons s on s.id = c.season_id and s.is_current
 where c.name = 'Premijer liga BiH' and m.competition_id = c.id and m.digital_scoresheet;

update public.assignments a
   set fee_km = null
  from public.matches m
  join public.competitions c on c.id = m.competition_id
  join public.seasons s on s.id = c.season_id and s.is_current
 where c.name = 'Premijer liga BiH' and a.match_id = m.id and a.position = 'scorer' and a.fee_km = 50;
