-- Raspored saveza (Minibasket) zove klub "BOSNA SPARS", ne "KK Spars" — klub je Bosnin minibasket
-- partner (ista konvencija kao KK Bosna). Preimenuj klub i obje njegove ekipe, i preuzmi Bosnin logo.
update public.clubs
set name = 'Bosna Spars', short_name = 'Bosna Spars',
    logo_url = (select logo_url from public.clubs where name = 'KK Bosna')
where id = '5d655778-973c-4589-849c-ab5eaf8f9ccd';

update public.teams set name = 'Bosna Spars' where id = '711ffedd-e1d9-4ccb-9f65-01ddfa72a1b8';
update public.teams set name = 'Bosna Spars B' where id = 'ed457ee6-e5de-42cb-a517-2e7fc9a01046';
