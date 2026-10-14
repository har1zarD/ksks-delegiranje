-- EuroCup i ABA liga: KSKS delegira samo pomoćne sudije (sudije i komesara delegira organizator)
insert into public.competitions
  (season_id, name, short_name, category, gender, sort, split_nominations,
   referees_default, referee_count_default, commissioner_default, scorer_default, timer_default, shot_clock_default, stats_default, table_count_default)
select s.id, v.name, v.short_name, 'seniori', 'M', v.sort, true, false, 3, false, true, true, true, 1, 3
  from public.seasons s
 cross join (values ('EuroCup', 'EuroCup', 99), ('ABA liga', 'ABA liga', 100)) as v(name, short_name, sort)
 where s.is_current
   and not exists (select 1 from public.competitions c where c.season_id = s.id and c.name = v.name);
