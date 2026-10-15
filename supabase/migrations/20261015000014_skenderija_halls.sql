-- ───────── Dvorane Skenderija D1 i D2 (umjesto SD Skenderija) ─────────
insert into public.halls (name, city)
select v.name, v.city
  from (values
    ('SD Skenderija D1', 'Sarajevo'),
    ('SD Skenderija D2', 'Sarajevo')
  ) as v(name, city)
 where not exists (select 1 from public.halls h where h.name = v.name);

-- Sve što je bilo u SD Skenderija prelazi u D1, pa se stara dvorana briše
update public.matches set hall_id = (select id from public.halls where name = 'SD Skenderija D1')
 where hall_id = (select id from public.halls where name = 'SD Skenderija');
update public.clubs set hall_id = (select id from public.halls where name = 'SD Skenderija D1')
 where hall_id = (select id from public.halls where name = 'SD Skenderija');
delete from public.halls where name = 'SD Skenderija';
