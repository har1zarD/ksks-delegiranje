-- Ručna naknada po delegiranju: kad cijena na utakmici treba biti drugačija od pravila takmičenja
-- (ili pravilo nije određeno). null = važi cijena iz pravila takmičenja.
alter table public.assignments
  add column fee_km numeric(8,2) check (fee_km >= 0 and fee_km <= 10000);
