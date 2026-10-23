-- Ime foldera licenci kad se razlikuje od naziva kluba (npr. ekipa nastupa pod drugim imenom u tom takmičenju)
alter table public.license_folders add column name text;

-- KK Point u A2 ligi jug KSBiH nastupa kao "KK Point - Richmond Park"
update public.license_folders
set name = 'KK Point - Richmond Park'
where competition_id = 'd74bc0b4-99f1-4313-8c15-463f76d06764'
  and club_id = '436f8af2-7691-4a1b-8666-71057277d861';
