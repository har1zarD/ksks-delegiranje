-- Mailing lista klubova: raspored (i izmjene utakmica) dobijaju SAMO klubovi omladinske lige (youth = true).
-- Admin kvačicom bira klubove; početno su označeni klubovi koji imaju ekipu u omladinskom takmičenju tekuće sezone.
alter table public.clubs add column youth boolean not null default false;

update public.clubs c
   set youth = true
 where exists (
   select 1
     from public.teams t
     join public.competitions k on k.id = t.competition_id
     join public.seasons s on s.id = k.season_id
    where t.club_id = c.id
      and s.is_current
      and k.category in ('pioniri', 'kadeti', 'juniori', 'minibasket', 'unobasket')
 );
