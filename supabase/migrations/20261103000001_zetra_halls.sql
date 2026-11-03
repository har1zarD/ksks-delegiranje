-- ───────── Zetra: SD Zetra → SD Zetra Centralna, plus nova dvorana SD Zetra teren 2 ─────────
-- Utakmice i klubovi drže hall_id, pa preimenovanjem sve dosadašnje utakmice u Zetri postaju "SD Zetra Centralna".
update public.halls set name = 'SD Zetra Centralna'
 where name = 'SD Zetra'
   and not exists (select 1 from public.halls where name = 'SD Zetra Centralna');

insert into public.halls (name, address, city)
select 'SD Zetra teren 2', h.address, coalesce(h.city, 'Sarajevo')
  from public.halls h
 where h.name = 'SD Zetra Centralna'
   and not exists (select 1 from public.halls where name = 'SD Zetra teren 2');
