-- KK Hrasnica, Kadeti — Grupa 2: Jan Tomljenović — fotografija (Viber, poslao korisnik) i ispravan
-- datum rođenja po putovnici (21.06.2013, ranije upisan placeholder 01.01.2013 jer tačan datum
-- nije bio poznat).
update public.licenses
  set photo_path = 'dc904a0c-f1e0-4fac-8da6-51f0ace7be16/1794060940775-3993b68f.jpg',
      birth_date = '2013-06-21'
  where id = '96d761c6-9245-41fb-8043-7d9ddecc8584'; -- Jan Tomljenović
