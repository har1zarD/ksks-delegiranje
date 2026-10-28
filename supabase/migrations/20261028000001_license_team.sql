-- Licence po ekipi: klub s više ekipa u istoj omladinskoj kategoriji (npr. Realway Plavi, Bijeli i Akademija u Pionirima G2)
-- ima folder za svaku ekipu. team_id je prazan kad klub ima jednu ekipu u takmičenju (folder je klub).
alter table public.licenses add column team_id uuid references public.teams (id) on delete set null;

-- Pioniri G2: postojeće licence Realwaya su lista Akademije
update public.licenses
set team_id = 'e3f905ca-50c7-444d-b235-f23e00223813'
where competition_id = '9a46987b-ee80-4ad4-b956-4dd29bebaf37'
  and club_id = '2bc39e25-4b29-49e9-a2b2-255f068b5ef0';

-- Kadeti G2: postojeće licence BBY-a su ekipa KK BBY (druga ekipa je KK BBY 3x3)
update public.licenses
set team_id = 'e2070a06-faf7-4e49-ba2b-50bca06b04c1'
where competition_id = 'efa174a7-1a9a-464c-ad1d-5c8ba0aee67b'
  and club_id = 'cc10bf84-437d-4ccf-915d-8a5e65ec5010';

-- Folder "KK Realway Akademija" (klub) zamjenjuju folderi po ekipi
delete from public.license_folders
where competition_id = '9a46987b-ee80-4ad4-b956-4dd29bebaf37'
  and club_id = '2bc39e25-4b29-49e9-a2b2-255f068b5ef0';
