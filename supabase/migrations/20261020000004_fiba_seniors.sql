-- FIBA uživo i za seniorske lige BiH sezone 2026/27: Premijer liga BiH (M i Ž) i A1 liga KSBiH.
-- A2 liga (jug/sjever) još nema utakmica na FIBA LiveStats; dodaje se kad KSBiH otvori takmičenje.
--  * fiba_competitions.category: filter na stranici (null = omladinska liga KS, kategorija je po utakmici)
--  * fiba_games.stream_key: pristupni kod FIBA utakmice (iz tabele KSBiH); pri povezivanju prelazi na našu utakmicu
alter table public.fiba_competitions add column category text;
alter table public.fiba_games add column stream_key text check (stream_key ~ '^[A-Za-z0-9]{6,40}$');

insert into public.fiba_competitions (id, name, sort, active, category) values
  (50128, 'Premijer liga BiH', 1, true, 'plbih'),
  (50228, 'Premijer liga BiH — žene', 2, true, 'plbih_z'),
  (50201, 'A1 liga KSBiH', 3, true, 'a1')
on conflict (id) do update set name = excluded.name, sort = excluded.sort, active = true, category = excluded.category;
