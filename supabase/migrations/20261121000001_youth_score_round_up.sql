-- Minibasket i Unobasket (korisnik, 21.11.2026.): konačni rezultat utakmice se zaokružuje naviše,
-- npr. bodovi četvrtina 2,5 : 1,5 → 3 : 2. Važi za svaki upis (okidač iz četvrtina, ručni upis, admin, bilten čita bazu).
create or replace function public.round_youth_score()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if exists (select 1 from public.competitions c
              where c.id = new.competition_id and c.category in ('minibasket', 'unobasket')) then
    new.home_score := ceil(new.home_score);
    new.away_score := ceil(new.away_score);
  end if;
  return new;
end $function$;

create trigger matches_round_youth_score
  before insert or update of home_score, away_score, competition_id on public.matches
  for each row execute function public.round_youth_score();

-- Već upisani rezultati s polovinama (npr. KK Igman – KK Realway Bijeli 2,5 : 1,5 → 3 : 2): okidač ih zaokruži.
update public.matches m
   set home_score = m.home_score, away_score = m.away_score
  from public.competitions c
 where c.id = m.competition_id
   and c.category in ('minibasket', 'unobasket')
   and (m.home_score <> ceil(m.home_score) or m.away_score <> ceil(m.away_score));
