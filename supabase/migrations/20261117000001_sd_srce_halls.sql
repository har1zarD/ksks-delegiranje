-- ───────── Nove dvorane: SD Srce 1 i SD Srce 2 ─────────
insert into public.halls (name, city)
values ('SD Srce 1', 'Sarajevo'),
       ('SD Srce 2', 'Sarajevo')
on conflict (name) do nothing;
