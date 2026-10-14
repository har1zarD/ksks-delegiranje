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
