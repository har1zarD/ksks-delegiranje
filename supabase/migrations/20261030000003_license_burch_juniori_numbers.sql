-- Brojevi licenci KK Igman Burch, Juniori: nastavak niza za takmičenje (do sada 001-113, bez praznina/duplikata)
update public.licenses set license_no = v.license_no
  from (values
    ('Muhedinović', 'Adi',    '114'),
    ('Pešto',       'Emin',   '115'),
    ('Čatal',       'Bakir',  '116'),
    ('Lukavica',    'Samid',  '117'),
    ('Delić',       'Edis',   '118'),
    ('Lokvančić',   'Tarik',  '119'),
    ('Habota',      'Emir',   '120'),
    ('Ramić',       'Džanan', '121'),
    ('Đuranović',   'Vedad',  '122'),
    ('Biberović',   'Ali',    '123'),
    ('Muminović',   'Mirnes', '124')
  ) as v (last_name, first_name, license_no)
 where licenses.competition_id = '76190da0-e3cd-4939-81e9-c05cd590890c'
   and licenses.club_id = '3e399948-dfc5-4859-8db9-8fa67fbf6bc0'
   and licenses.last_name = v.last_name
   and licenses.first_name = v.first_name;
