-- Seniori: samo pomoćne sudije u Premijer ligi, A1, A2 jug, EuroCup, ABA ligi i A1 ligi žene.
-- Prva liga FBiH i Liga KS ne postoje (obrisane kroz aplikaciju: Takmičenja → Obriši takmičenje).
update public.competitions
   set referees_default = false, commissioner_default = false, split_nominations = false
 where name in ('Premijer liga BiH', 'A1 liga KSBiH', 'A2 liga jug KSBiH', 'EuroCup', 'ABA liga');

update public.competitions
   set name = 'A1 liga žene', short_name = 'A1 žene',
       referees_default = false, commissioner_default = false, split_nominations = false
 where name = 'Ženska liga';
