-- Odsustvo s tačnim vremenom (od–do) umjesto cijelih dana.
-- Postojeća odsustva postaju cijeli dani po sarajevskom vremenu: od 00:00 prvog dana do 00:00 dana poslije zadnjeg.
alter table public.unavailability
  add column starts_at timestamptz,
  add column ends_at   timestamptz;

update public.unavailability
   set starts_at = from_date::timestamp at time zone 'Europe/Sarajevo',
       ends_at   = (to_date + 1)::timestamp at time zone 'Europe/Sarajevo';

alter table public.unavailability
  alter column starts_at set not null,
  alter column ends_at   set not null,
  add constraint unavailability_range check (ends_at > starts_at);

-- Stari indeks i provjera (to_date >= from_date) padaju zajedno s kolonama
alter table public.unavailability drop column from_date, drop column to_date;

create index unavailability_profile on public.unavailability (profile_id, starts_at);
-- Delegiranje: ko je odsutan u vrijeme utakmice (preklapanje intervala)
create index unavailability_window on public.unavailability (starts_at, ends_at);
