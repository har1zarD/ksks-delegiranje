-- Licence KK Realway Plavi i KK Realway Bijeli, Pioniri Grupa 2, sezona 2026/27
-- (REALWAY B.docx + fotografije emailom 30.10.2026 - isti spisak vrijedi za oba tima; trener Adnan Subašić)
insert into public.licenses (competition_id, club_id, team_id, kind, role, last_name, first_name, birth_date, birth_place, photo_path, sort)
select '9a46987b-ee80-4ad4-b956-4dd29bebaf37', '2bc39e25-4b29-49e9-a2b2-255f068b5ef0', team_id::uuid, kind, role, last_name, first_name, birth_date::date, birth_place, photo_path, sort
from (values
  ('27624ba0-d02b-4f8f-82c5-5666fdfca0a6'),
  ('a1fac627-3b92-4646-a116-980accfa616c')
) as t(team_id)
cross join (values
  ('player', null, 'Jotanović',    'Edi',     '2012-04-21', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/jotanovic-edi.jpg',        1),
  ('player', null, 'Joldo',        'Arif',    '2011-08-26', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/joldo-arif.jpg',           2),
  ('player', null, 'Subašić',      'Ahmed',   '2013-08-21', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/subasic-ahmed.jpg',        3),
  ('player', null, 'Milić',        'Rian',    '2012-04-15', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/milic-rian.jpg',           4),
  ('player', null, 'Džananović',   'Mak',     '2012-02-16', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/dzananovic-mak.jpg',       5),
  ('player', null, 'Čustović',     'Zlatan',  '2012-10-22', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/custovic-zlatan.jpg',      6),
  ('player', null, 'Subotić',      'Adin',    '2013-02-07', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/subotic-adin.jpg',         7),
  ('player', null, 'Gačanin',      'Emin',    '2013-01-04', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/gacanin-emin.jpg',         8),
  ('player', null, 'Semić',        'Arijan',  '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/semic-arijan.jpg',         9),
  ('player', null, 'Hasković',     'Aziz',    '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/haskovic-aziz.jpg',        10),
  ('player', null, 'Mujić',        'Edin',    '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/mujic-edin.jpg',           11),
  ('player', null, 'Kašić',        'Rejhan',  '2012-08-02', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/kasic-rejhan.jpg',         12),
  ('player', null, 'Softić',       'Arslan',  '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/softic-arslan.jpg',        13),
  ('player', null, 'Mešić',        'Danin',   '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/mesic-danin.jpg',          14),
  ('player', null, 'Čehić',        'Eman',    '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/cehic-eman.jpg',           15),
  ('player', null, 'Demir',        'Harun',   '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/demir-harun.jpg',          16),
  ('player', null, 'Kahriman',     'Harun',   '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/kahriman-harun.jpg',       17),
  ('player', null, 'Behram',       'Tarik',   '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/behram-tarik.jpg',         18),
  ('player', null, 'Sejfović',     'Eman',    '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/sejfovic-eman.jpg',        19),
  ('player', null, 'Mujezinović',  'Faris',   '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/mujezinovic-faris.jpg',    20),
  ('player', null, 'Čampara',      'Tarik',   '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/campara-tarik.jpg',        21),
  ('player', null, 'Šero',         'Mirza',   '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/sero-mirza.jpg',           22),
  ('player', null, 'Parić',        'Feđa',    '2012-01-01', null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/paric-fedja.jpg',          23),
  ('official', 'Trener', 'Subašić', 'Adnan',  null, null, '2bc39e25-4b29-49e9-a2b2-255f068b5ef0/subasic-adnan.jpg',               24)
) as v(kind, role, last_name, first_name, birth_date, birth_place, photo_path, sort);
