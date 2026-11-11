-- Minibasket: rezultat utakmice su bodovi četvrtina (korisnik, 11.11.2026.). Sudije ili pomoćne sudije upišu koševe
-- za 4 četvrtine (match_periods); dobijena četvrtina 1 bod, neriješena 0,5 svakoj ekipi, izgubljena 0.
-- Zbir (npr. 3,5 : 0,5) je rezultat utakmice u matches.home_score/away_score, pa ga čitaju tabela, liste i bilten.

-- Rezultat mora držati polovine (do sada smallint)
alter table public.matches
  alter column home_score type numeric(4,1),
  alter column away_score type numeric(4,1);

-- Ukupni rezultat iz četvrtina: Minibasket bodovi četvrtina (samo 1.–4.), ostala takmičenja zbir koševa kao do sada.
-- Bez ijedne četvrtine rezultat je null.
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
       set home_score = s.h, away_score = s.a
      from (select sum(case when home_points > away_points then 1 when home_points = away_points then 0.5 else 0 end) h,
                   sum(case when away_points > home_points then 1 when home_points = away_points then 0.5 else 0 end) a
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
