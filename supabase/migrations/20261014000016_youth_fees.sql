-- Naknade omladinska liga (2026-10-14): sudije po sudiji (dvojka / trojka), pomoćne sudije i statistika 10 KM po osobi
update public.competitions c
   set fee_referee_2_km = v.r2, fee_referee_3_km = v.r3, fee_table_km = 10, fee_stats_km = 10
  from (values ('juniori', 40, 26), ('kadeti', 30, 20), ('pioniri', 20, 13)) as v(category, r2, r3),
       public.seasons s
 where c.category = v.category and s.id = c.season_id and s.is_current;

-- Minibasket i Unobasket: uvijek dvojica sudija, 15 KM po sudiji
update public.competitions c
   set referees_default = true, referee_count_default = 2, fee_referee_2_km = 15
  from public.seasons s
 where c.category in ('minibasket', 'unobasket') and s.id = c.season_id and s.is_current;

-- A1 i A2 liga jug: pomoćne sudije (zapisnik, glavno vrijeme, 24/14, statistika) 30 KM po osobi
update public.competitions c
   set fee_table_km = 30, fee_stats_km = 30
  from public.seasons s
 where c.name in ('A1 liga KSBiH', 'A2 liga jug KSBiH') and s.id = c.season_id and s.is_current;

-- ABA liga i EuroCup: pomoćne sudije 50 KM po osobi
update public.competitions c
   set fee_table_km = 50, fee_stats_km = 50
  from public.seasons s
 where c.name in ('ABA liga', 'EuroCup') and s.id = c.season_id and s.is_current;

-- Bez komesara: Minibasket, Unobasket i grupe 2 (pravilo i postojeće utakmice)
update public.competitions c
   set commissioner_default = false, fee_commissioner_km = null
  from public.seasons s
 where c.name in ('Minibasket', 'Unobasket', 'Pioniri — Grupa 2', 'Kadeti — Grupa 2') and s.id = c.season_id and s.is_current;

update public.matches m
   set has_commissioner = false
  from public.competitions c
 where m.competition_id = c.id and c.name in ('Minibasket', 'Unobasket', 'Pioniri — Grupa 2', 'Kadeti — Grupa 2') and m.has_commissioner;

-- Komesar: Pioniri G1 20, Kadeti G1 30, Juniori 40 KM
update public.competitions c set fee_commissioner_km = v.fee
  from public.seasons s, (values ('Pioniri — Grupa 1', 20), ('Kadeti — Grupa 1', 30), ('Juniori', 40)) v(name, fee)
 where s.id = c.season_id and s.is_current and c.name = v.name;

-- Pomoćne sudije: Minibasket/Unobasket 8, Premijer liga 50, A1 liga žene 20 KM
update public.competitions c set fee_table_km = v.fee, fee_stats_km = v.fee
  from public.seasons s, (values ('Minibasket', 8), ('Unobasket', 8), ('Premijer liga BiH', 50), ('A1 liga žene', 20)) v(name, fee)
 where s.id = c.season_id and s.is_current and c.name = v.name;

-- A1 liga žene: samo zapisnik i jedna statistika
update public.competitions c
   set scorer_default = true, assistant_scorer_default = false, timer_default = false, shot_clock_default = false, stats_default = 1, table_count_default = 2
  from public.seasons s
 where s.id = c.season_id and s.is_current and c.name = 'A1 liga žene';
