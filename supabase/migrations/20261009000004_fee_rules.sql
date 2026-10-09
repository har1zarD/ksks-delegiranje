-- Naknade po pravilima takmičenja (zamjenjuje fee_rates po poziciji):
--   sudija: posebna cijena kad sude dvojica i kad sude trojica (po sudiji)
--   zapisnički sto: cijena po osobi; komesar: cijena po utakmici
-- Utakmica nosi broj sudija (2/3) i broj ljudi za stolom (2/3); takmičenje daje podrazumijevane vrijednosti.

alter table public.competitions
  add column referee_count_default smallint not null default 2 check (referee_count_default in (2, 3)),
  add column table_count_default   smallint not null default 3 check (table_count_default in (2, 3)),
  add column fee_referee_2_km      numeric(8,2) check (fee_referee_2_km >= 0),   -- po sudiji, utakmica s 2 sudije
  add column fee_referee_3_km      numeric(8,2) check (fee_referee_3_km >= 0),   -- po sudiji, utakmica s 3 sudije
  add column fee_table_km          numeric(8,2) check (fee_table_km >= 0),       -- po osobi za zapisničkim stolom
  add column fee_commissioner_km   numeric(8,2) check (fee_commissioner_km >= 0);

-- 2 = zapisničar + mjerač vremena; 3 = + operator 24 sekunde
alter table public.matches
  add column table_count smallint not null default 3 check (table_count in (2, 3));
