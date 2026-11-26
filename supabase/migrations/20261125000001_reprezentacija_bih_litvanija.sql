-- Reprezentacija BiH (muškarci): BiH — Litvanija, nedjelja 29.11.2026. u 18:00, SD Zetra teren 1.
-- Ekipa za stolom kao kod ženske reprezentacije (BiH — Kipar); sudije i komesara delegira FIBA.
insert into public.competitions
  (season_id, name, short_name, category, gender, sort, split_nominations,
   referees_default, referee_count_default, commissioner_default, scorer_default, timer_default, shot_clock_default, stats_default, table_count_default)
select s.id, 'Reprezentacija Bosne i Hercegovine', 'Reprezentacija', 'seniori', 'M', 104, false,
       false, 2, false, true, true, true, 2, 3
  from public.seasons s
 where s.is_current
   and not exists (select 1 from public.competitions c where c.season_id = s.id and c.name = 'Reprezentacija Bosne i Hercegovine');

insert into public.clubs (name, short_name, logo_url)
select 'Litvanija', 'Litvanija', 'https://fxdzcncfoutxunfwcyhi.supabase.co/storage/v1/object/public/club-logos/2026-11-25/flags/litvanija.png'
 where not exists (select 1 from public.clubs where name = 'Litvanija');

insert into public.teams (competition_id, club_id, name, sort)
select c.id, cl.id, cl.name, v.sort
  from public.competitions c
  join public.seasons s on s.id = c.season_id and s.is_current
 cross join (values ('Bosna i Hercegovina', 1), ('Litvanija', 2)) as v(club, sort)
  join public.clubs cl on cl.name = v.club
 where c.name = 'Reprezentacija Bosne i Hercegovine'
   and not exists (select 1 from public.teams t where t.competition_id = c.id and t.club_id = cl.id);

insert into public.matches
  (competition_id, home_team_id, away_team_id, hall_id, starts_at, referee_count, table_count,
   has_referees, has_commissioner, has_scorer, has_assistant_scorer, has_timer, has_shot_clock, stats_count, digital_scoresheet)
select c.id, ht.id, at.id, h.id, '2026-11-29 18:00 Europe/Sarajevo', 2, 3,
       false, false, true, true, true, true, 2, true
  from public.competitions c
  join public.seasons s on s.id = c.season_id and s.is_current
  join public.teams ht on ht.competition_id = c.id and ht.name = 'Bosna i Hercegovina'
  join public.teams at on at.competition_id = c.id and at.name = 'Litvanija'
  join public.halls h on h.name = 'SD Zetra teren 1'
 where c.name = 'Reprezentacija Bosne i Hercegovine'
   and not exists (select 1 from public.matches m where m.competition_id = c.id and m.home_team_id = ht.id and m.away_team_id = at.id);
