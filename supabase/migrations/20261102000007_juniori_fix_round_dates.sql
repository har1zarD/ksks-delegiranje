-- Juniori kola 2-9: utakmice su već u bazi sa ispravnim parovima (poklapaju se sa PDF-om saveza
-- "JUNIORI- SEZONA 2026-2027"), ali datum je bio generički (svakih 14 dana od 14.11.2026, npr. kolo 7
-- je pokazivalo 13.02.2027 umjesto stvarnog 12.12.2026). Ispravljeno na stvarne datume kola iz PDF-a,
-- isto vrijeme (09:00 UTC) kao i dosad — dvoranu admin upisuje po utakmici. Kolo 1 nije dirano (već
-- stvarno odigrano/upisano). Kola 10-18 savez još nije datirao (vidi juniori-raspored.ts).
update public.matches set starts_at = '2026-11-07T09:00:00+00' where round = 2 and competition_id = '76190da0-e3cd-4939-81e9-c05cd590890c';
update public.matches set starts_at = '2026-11-14T09:00:00+00' where round = 3 and competition_id = '76190da0-e3cd-4939-81e9-c05cd590890c';
update public.matches set starts_at = '2026-11-21T09:00:00+00' where round = 4 and competition_id = '76190da0-e3cd-4939-81e9-c05cd590890c';
update public.matches set starts_at = '2026-11-28T09:00:00+00' where round = 5 and competition_id = '76190da0-e3cd-4939-81e9-c05cd590890c';
update public.matches set starts_at = '2026-12-05T09:00:00+00' where round = 6 and competition_id = '76190da0-e3cd-4939-81e9-c05cd590890c';
update public.matches set starts_at = '2026-12-12T09:00:00+00' where round = 7 and competition_id = '76190da0-e3cd-4939-81e9-c05cd590890c';
update public.matches set starts_at = '2026-12-19T09:00:00+00' where round = 8 and competition_id = '76190da0-e3cd-4939-81e9-c05cd590890c';
update public.matches set starts_at = '2026-12-26T09:00:00+00' where round = 9 and competition_id = '76190da0-e3cd-4939-81e9-c05cd590890c';
