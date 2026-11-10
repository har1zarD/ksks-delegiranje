-- ───────── Zetra: SD Zetra Centralna → SD Zetra teren 1 ─────────
-- Utakmice drže hall_id, pa preimenovanjem sve dosadašnje utakmice u centralnoj Zetri postaju "SD Zetra teren 1".
update public.halls set name = 'SD Zetra teren 1'
 where name = 'SD Zetra Centralna'
   and not exists (select 1 from public.halls where name = 'SD Zetra teren 1');
