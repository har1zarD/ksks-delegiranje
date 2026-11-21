-- ŽOL — Pionirke: dodaje ekipu "ŽKK Jedinstvo" (isti klub kao Jedinstvo u ŽOL — Kadetkinje).
insert into public.teams (competition_id, club_id, name, sort)
select 'c661f272-7329-486d-ba5e-5edeb7924586', t.club_id, 'ŽKK Jedinstvo', 0
from public.teams t
where t.id = '979cfd57-11af-4b58-83a8-690cb2166fc8'
on conflict (competition_id, name) do nothing;
