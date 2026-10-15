-- Folder licenci: klub u takmičenju. Postoji i prije prve licence (admin ga napravi pa dodaje igrače).
create table public.license_folders (
  competition_id uuid not null references public.competitions (id) on delete cascade,
  club_id        uuid not null references public.clubs (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (competition_id, club_id)
);

-- Samo servisni klijent (admin); bez politika nema pristupa kroz API
alter table public.license_folders enable row level security;

-- Postojeće licence (IUS-Famos, A1 liga)
insert into public.license_folders (competition_id, club_id)
select distinct competition_id, club_id from public.licenses
on conflict do nothing;
