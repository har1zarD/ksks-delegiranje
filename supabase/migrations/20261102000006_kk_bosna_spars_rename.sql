-- Ispravka naziva: "KK Bosna Spars" (ne "Bosna Spars"), kao i ostali klubovi sa "KK" prefiksom.
update public.clubs set name = 'KK Bosna Spars', short_name = 'Bosna Spars' where id = '5d655778-973c-4589-849c-ab5eaf8f9ccd';
update public.teams set name = 'KK Bosna Spars' where id = '711ffedd-e1d9-4ccb-9f65-01ddfa72a1b8';
update public.teams set name = 'KK Bosna Spars B' where id = 'ed457ee6-e5de-42cb-a517-2e7fc9a01046';
