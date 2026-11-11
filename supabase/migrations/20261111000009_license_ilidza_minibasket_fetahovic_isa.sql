-- KK Ilidža, Minibasket: Isa Fetahović (već licenciran za Unobasket) dodan i na Minibasket spisak, po molbi trenera i odobrenju korisnika.
-- Broj licence 200 je nastavak niza za takmičenje (do sada 001-199); ista fotografija kao u Unobasketu.
insert into public.licenses (competition_id, club_id, kind, last_name, first_name, birth_date, birth_place, license_no, photo_path, sort)
values (
  'ecd30198-7ae7-4856-a411-d7bb0c7e35d3',
  '370294d2-5ab0-4ac7-9ebb-fc1637027a82',
  'player', 'Fetahović', 'Isa', '2016-10-28', 'Sarajevo', '200',
  '370294d2-5ab0-4ac7-9ebb-fc1637027a82/1794402535288-9f503465.jpg',
  16
);
