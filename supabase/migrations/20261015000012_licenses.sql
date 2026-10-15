-- Licence igrača i službenih lica kluba po takmičenju (lista za licenciranje).
-- Fotografije u privatnom bucketu "licenses" (putanja <club_id>/<prezime-ime>.jpg); čitaju se samo kroz server
-- servisnim ključem nakon provjere da je korisnik admin, pa storage politike nisu potrebne.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('licenses', 'licenses', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create table public.licenses (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  club_id        uuid not null references public.clubs (id) on delete cascade,
  kind           text not null check (kind in ('player', 'official')),
  role           text,      -- službeno lice: Trener, Ljekar, Fizioterapeut, Službeno lice
  last_name      text not null,
  first_name     text not null,
  birth_date     date,
  birth_place    text,
  height_cm      smallint,
  position       text,      -- igrač: PG, SG, SF, PF, C
  license_no     text,
  photo_path     text,
  sort           smallint not null default 0,
  created_at     timestamptz not null default now()
);
create index licenses_competition_club on public.licenses (competition_id, club_id, kind, sort);

-- Samo servisni klijent (admin); bez politika nema pristupa kroz API
alter table public.licenses enable row level security;

-- KK IUS-Famos, A1 liga KSBiH 2026/27
insert into public.licenses (competition_id, club_id, kind, role, last_name, first_name, birth_date, birth_place, height_cm, position, photo_path, sort)
select c.id, k.id, v.kind, v.role, v.last_name, v.first_name, v.birth_date::date, v.birth_place, v.height_cm, v.position,
       case when v.photo is null then null else k.id || '/' || v.photo end, v.sort
  from public.competitions c
  join public.seasons s on s.id = c.season_id and s.is_current
  cross join public.clubs k
  cross join (values
    ('player', null, 'Balić',     'Amar',    '1996-02-11', 'Milan',     185, 'PG', 'balic-amar.jpg',      1),
    ('player', null, 'Kurić',     'Bakir',   '2008-10-09', 'Sarajevo',  180, 'PG', 'kuric-bakir.jpg',     2),
    ('player', null, 'Zjajo',     'Ahmed',   '2007-03-22', 'Sarajevo',  175, 'PG', 'zjajo-ahmed.jpg',     3),
    ('player', null, 'Smajović',  'Tarik',   '2005-03-14', 'Ilidža',    195, 'SG', 'smajovic-tarik.jpg',  4),
    ('player', null, 'Ramić',     'Kerim',   '2002-04-04', 'Sarajevo',  195, 'SG', 'ramic-kerim.jpg',     5),
    ('player', null, 'Džubur',    'Ahmed',   '2008-10-17', 'Sarajevo',  188, 'SG', null,                  6),
    ('player', null, 'Mešetović', 'Nadir',   '1996-05-29', 'Gračanica', 198, 'SF', 'mesetovic-nadir.jpg', 7),
    ('player', null, 'Pilav',     'Omar',    '2002-10-05', 'Sarajevo',  195, 'SF', 'pilav-omar.jpg',      8),
    ('player', null, 'Hodžić',    'Nedžad',  '1999-07-20', 'Olovo',     198, 'PF', 'hodzic-nedzad.jpg',   9),
    ('player', null, 'Saračević', 'Alem',    '2006-09-11', 'Bihać',     200, 'PF', 'saracevic-alem.jpg',  10),
    ('player', null, 'Saračević', 'Merim',   '2003-10-28', 'Tešanj',    200, 'PF', 'saracevic-merim.jpg', 11),
    ('player', null, 'Agić',      'Jasmin',  '2005-07-03', 'Tuzla',     200, 'PF', 'agic-jasmin.jpg',     12),
    ('player', null, 'Memić',     'Enis',    '1997-02-23', 'Sarajevo',  205, 'C',  'memic-enis.jpg',      13),
    ('player', null, 'Bešović',   'Admir',   '1997-10-28', 'Sarajevo',  210, 'C',  'besovic-admir.jpg',   14),
    ('player', null, 'Hodžić',    'Harun',   '2006-08-21', 'Konjic',    210, 'C',  'hodzic-harun.jpg',    15),
    ('official', 'Trener',        'Hodža',     'Ammar',    null, null, null, null, 'hodza-ammar.jpg',        1),
    ('official', 'Trener',        'Mešanović', 'Mirnes',   null, null, null, null, 'mesanovic-mirnes.jpg',   2),
    ('official', 'Trener',        'Gegić',     'Emir',     null, null, null, null, 'gegic-emir.jpg',         3),
    ('official', 'Trener',        'Damjanović','Sanjin',   null, null, null, null, 'damjanovic-sanjin.jpg',  4),
    ('official', 'Ljekar',        'Pepeljak',  'Sanel',    null, null, null, null, 'pepeljak-sanel.jpg',     5),
    ('official', 'Fizioterapeut', 'Šemsović',  'Arel',     null, null, null, null, 'semsovic-arel.jpg',      6),
    ('official', 'Službeno lice', 'Mešanović', 'Mirnes',   null, null, null, null, 'mesanovic-mirnes.jpg',   7),
    ('official', 'Službeno lice', 'Yasir Göz', 'Muhammed', null, null, null, null, 'yasir-goz-muhammed.jpg', 8),
    ('official', 'Službeno lice', 'Kendić',    'Imran',    null, null, null, null, 'kendic-imran.jpg',       9),
    ('official', 'Službeno lice', 'Inal',      'Ibrahim',  null, null, null, null, 'inal-ibrahim.jpg',       10)
  ) as v (kind, role, last_name, first_name, birth_date, birth_place, height_cm, position, photo, sort)
 where c.name = 'A1 liga KSBiH' and k.short_name = 'IUS-Famos';
