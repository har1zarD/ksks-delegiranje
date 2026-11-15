-- Minibasket (korisnik, 15.11.2026.): kad je nakon 4 četvrtine neriješeno po bodovima četvrtina (2:2),
-- ekipa s više ukupnih koševa dobija još 1 bod (npr. koševi 23:25 → 2:3). Ostala takmičenja bez promjene.
create or replace function public.sync_match_score()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  mid uuid := coalesce(new.match_id, old.match_id);
  quarters boolean;
begin
  select c.category = 'minibasket' into quarters
    from public.matches m
    join public.competitions c on c.id = m.competition_id
   where m.id = mid;

  if coalesce(quarters, false) then
    update public.matches m
       set home_score = s.h + case when s.n = 4 and s.h = s.a and s.kh > s.ka then 1 else 0 end,
           away_score = s.a + case when s.n = 4 and s.h = s.a and s.ka > s.kh then 1 else 0 end
      from (select sum(case when home_points > away_points then 1 when home_points = away_points then 0.5 else 0 end) h,
                   sum(case when away_points > home_points then 1 when home_points = away_points then 0.5 else 0 end) a,
                   sum(home_points) kh,
                   sum(away_points) ka,
                   count(*) n
              from public.match_periods where match_id = mid and period <= 4) s
     where m.id = mid;
  else
    update public.matches m
       set home_score = s.h, away_score = s.a
      from (select sum(home_points) h, sum(away_points) a
              from public.match_periods where match_id = mid) s
     where m.id = mid;
  end if;
  return null;
end $function$;

-- KK BBY – KK Spars Jahorina (15.11.2026.): po zapisniku koševi po četvrtinama 8:6, 7:8, 6:4, 2:7 (ukupno 23:25),
-- upisani su bili bodovi četvrtina umjesto koševa. Okidač iz koševa računa 2:2 → 2:3.
update public.match_periods p
   set home_points = v.h, away_points = v.a, updated_at = now()
  from (values (1, 8, 6), (2, 7, 8), (3, 6, 4), (4, 2, 7)) v(period, h, a)
 where p.match_id = 'd966a253-7b30-4589-a8fa-0f84783de873' and p.period = v.period;

-- Bilten 1. kola Minibasketa imao je ručno upisan rezultat (2:2, bodovi umjesto koševa): briše se, pa bilten čita rezultat iz baze.
update public.bulletins
   set state = state #- '{scores,d966a253-7b30-4589-a8fa-0f84783de873}', updated_at = now()
 where id = 'a95050ee-0162-4c5d-ba3c-495a7d446386';
