-- WABA U15 (2026-10-17): KSKS delegira samo pomoćne sudije (zapisnik, vrijeme, statistika) po 10 KM;
-- sudije i komesara delegira drugi savez (referees_default i commissioner_default su već isključeni).
-- Primijenjeno direktno u bazi 2026-10-17; ovdje radi usklađenosti (idempotentno).
update public.competitions c
   set fee_table_km = 10, fee_stats_km = 10
  from public.seasons s
 where c.name = 'WABA U15' and s.id = c.season_id and s.is_current;
