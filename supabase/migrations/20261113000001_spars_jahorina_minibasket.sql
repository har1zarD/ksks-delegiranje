-- Minibasket: ekipa "KK Bosna Spars B" postaje "KK Spars Jahorina" (zaseban klub sa SN / Spars logom),
-- da bi imala svoje ime i logo; ista ekipa (isti team id), utakmice ostaju.
-- Licence po spisku "Spisak minibasket Bosna Spars B" (mail Nermin Selimović, 13.11.2026):
-- datum i mjesto rođenja sa pasoša / izvoda iz MKR. Brojevi licenci 201-221 nastavak niza Minibasketa.
-- Močević Aleksa: pasoš nije stigao (dopuna proslijeđena bez priloga) -> datum/mjesto prazni.
-- Jeremić Petar: na skenu pasoša se ne vidi mjesto rođenja -> prazno.
insert into public.clubs (id, name, short_name, email, logo_url, active, youth)
values ('2c9a214d-0b3a-4659-8c53-8b3bf9927eb9', 'KK Spars Jahorina', 'Spars Jahorina', 'nermin_spars@hotmail.com',
  'https://fxdzcncfoutxunfwcyhi.supabase.co/storage/v1/object/public/club-logos/2026-10-15/transparent-v2/5d655778-973c-4589-849c-ab5eaf8f9ccd.png',
  true, true);

update public.teams set club_id = '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9', name = 'KK Spars Jahorina'
where id = 'ed457ee6-e5de-42cb-a517-2e7fc9a01046';

insert into public.licenses (competition_id, club_id, kind, last_name, first_name, birth_date, birth_place, license_no, photo_path, sort)
select 'ecd30198-7ae7-4856-a411-d7bb0c7e35d3', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9', 'player', v.last_name, v.first_name, v.birth_date::date, v.birth_place, v.license_no, v.photo_path, v.sort
from (values
  ('Subotić', 'Luka', '2016-01-15', 'Foča', '201', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683505-c8d69be4.jpg', 1),
  ('Subotić', 'Aleksa', '2017-09-07', 'Kasindo', '202', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683506-50ed6d1e.jpg', 2),
  ('Sikiraš', 'Strahinja', '2016-03-15', 'Pale', '203', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683507-88bc73a3.jpg', 3),
  ('Jeremić', 'Petar', '2016-10-08', null, '204', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683508-3a3f249e.jpg', 4),
  ('Močević', 'Aleksa', null, null, '205', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683509-566d4c55.jpg', 5),
  ('Savić', 'Aleksa', '2016-10-22', 'Kasindo', '206', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683510-771869a1.jpg', 6),
  ('Janković', 'Radoš', '2016-09-03', 'Pale', '207', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683511-14e7e8ff.jpg', 7),
  ('Karna', 'Pavle', '2016-04-20', 'Kasindo', '208', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683512-2d3a7a1a.jpg', 8),
  ('Elčić', 'Lazar', '2016-05-10', 'Kasindo', '209', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683513-71db6c94.jpg', 9),
  ('Furtula', 'Filip', '2016-06-07', 'Kasindo', '210', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683514-247e1094.jpg', 10),
  ('Tešanović', 'Luka', '2017-12-11', 'Brčko', '211', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683515-3b60d0be.jpg', 11),
  ('Trkulja', 'Lazar', '2015-12-24', 'Kasindo', '212', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683516-1825131b.jpg', 12),
  ('Kajzer', 'Pavle', '2015-09-30', 'Kasindo', '213', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683517-92c9bd28.jpg', 13),
  ('Banjanin', 'Mihajlo', '2015-07-27', 'Pale', '214', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683518-1956b14c.jpg', 14),
  ('Kovačević', 'Vasilije', '2015-11-19', 'Pale', '215', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683519-df761c7d.jpg', 15),
  ('Blagojević', 'Maksim', '2015-08-16', 'Pale', '216', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683520-de87a897.jpg', 16),
  ('Stojanović', 'Miloš', '2015-10-19', 'Foča', '217', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683521-dbebab54.jpg', 17),
  ('Ćosić', 'Nemanja', '2014-02-03', 'Kasindo', '218', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683522-d91b7072.jpg', 18),
  ('Danilović', 'Teodor', '2014-03-02', 'Pale', '219', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683523-2fbb685a.jpg', 19),
  ('Mitrić', 'Nikša', '2014-09-10', 'Foča', '220', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683524-862f9a22.jpg', 20),
  ('Janković', 'Čarna', '2015-09-16', 'Pale', '221', '2c9a214d-0b3a-4659-8c53-8b3bf9927eb9/1794570683525-99984f21.jpg', 21)
) as v (last_name, first_name, birth_date, birth_place, license_no, photo_path, sort);
