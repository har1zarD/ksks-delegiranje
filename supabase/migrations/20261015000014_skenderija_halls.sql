-- ───────── Dvorane Skenderija D1 i D2 ─────────
insert into public.halls (name, city)
select v.name, v.city
  from (values
    ('SD Skenderija D1', 'Sarajevo'),
    ('SD Skenderija D2', 'Sarajevo')
  ) as v(name, city)
 where not exists (select 1 from public.halls h where h.name = v.name);
