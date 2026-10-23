-- Naziv ekipe s prefiksom kluba: muške ekipe "KK …", ženske "ŽKK …".
-- Bez stranih liga (EuroCup, ABA), Srednjih škola i ekipe ŽOL; ekipe koje već imaju prefiks ostaju.
-- Idempotentno: na produkciji je primijenjeno direktno 23. 10. 2026.
update public.teams t
   set name = case when c.gender = 'Ž' then 'ŽKK ' else 'KK ' end || regexp_replace(t.name, '^KK ', '')
  from public.competitions c
 where c.id = t.competition_id
   and coalesce(c.short_name, c.name) not in ('EuroCup', 'ABA liga', 'Srednje škole')
   and t.name <> 'ŽOL'
   and t.name !~ '^(OKK|HKK|ŽKK|KŽK) '
   and (t.name !~ '^KK ' or c.gender = 'Ž');
