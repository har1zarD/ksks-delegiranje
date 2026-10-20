-- FIBA LiveStats samo za omladinsku ligu KS (pioniri, kadeti, juniori, pionirke, kadetkinje) i veza s našom utakmicom.
--  * Ostala FIBA takmičenja se više ne prate
--  * fiba_games.category: kategorija (filter na stranici FIBA uživo)
--  * Utakmica nosi FIBA utakmicu (fiba_game_id) i pristupni kod za FIBA LiveStats (Stream Key) koji ide u nominaciju
update public.fiba_competitions set active = false where id <> 47625;
update public.fiba_competitions set name = 'Omladinska liga KS', sort = 0 where id = 47625;

alter table public.fiba_games add column category text;
-- Veza je na utakmici (matches.fiba_game_id), ne ovdje
alter table public.fiba_games drop column match_id;

alter table public.matches
  add column fiba_game_id    bigint unique references public.fiba_games (id) on delete set null,
  add column fiba_stream_key text check (fiba_stream_key ~ '^[A-Za-z0-9]{6,40}$');
