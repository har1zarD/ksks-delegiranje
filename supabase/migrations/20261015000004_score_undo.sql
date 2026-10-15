-- Kad je pomoćni sudija upisao konačni rezultat: 24 sata od tada ga smije ispraviti ili poništiti.
-- Rezultat koji upiše savez (admin) nema rok za sto, pa je tada null.
alter table public.matches add column score_entered_at timestamptz;
