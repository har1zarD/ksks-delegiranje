-- Statistika do 3 osobe (EuroCup); sastavi EuroCup i domaćih seniorskih liga
alter type public.assignment_position add value if not exists 'statistician_3' after 'statistician_2';

alter table public.matches drop constraint if exists matches_stats_count_check, add constraint matches_stats_count_check check (stats_count between 0 and 3);
alter table public.competitions drop constraint if exists competitions_stats_default_check, add constraint competitions_stats_default_check check (stats_default between 0 and 3);

-- EuroCup: statistika (3), glavno vrijeme, 24/14; bez sudija, komesara i zapisnika
update public.competitions
   set referees_default = false, commissioner_default = false, scorer_default = false, assistant_scorer_default = false,
       timer_default = true, shot_clock_default = true, stats_default = 3
 where name = 'EuroCup';

-- Premijer liga BiH, A1, A2 jug: statistika (2), semafor (glavno vrijeme), zapisnik, 24/14
update public.competitions
   set scorer_default = true, timer_default = true, shot_clock_default = true, stats_default = 2
 where name in ('Premijer liga BiH', 'A1 liga KSBiH', 'A2 liga jug KSBiH');
