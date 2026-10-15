-- Cijena zapisničara kad utakmica ima digitalni zapisnik (umjesto cijene stola); null = ista kao sto.
alter table public.competitions add column fee_digital_km numeric(8,2) check (fee_digital_km >= 0);
update public.competitions set fee_digital_km = 40 where name = 'Premijer liga BiH — žene';
