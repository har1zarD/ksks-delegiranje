-- Preventivno (korisnik, 2026-11-07): Kadeti sad imaju Grupu 1 i Grupu 2, a dosta klubova ima "drugi tim" u G2
-- čije ime se svodi na istu prvu riječ kao prvi tim u G1 (fiba_team_word gleda samo prvu riječ): "Koš"/"Koš B",
-- "MVP"/"MVP B", "Realway"/"Realway B", "Ilidža Orange"/"Ilidža Black". Ako FIBA ikad u istom vikendu objavi
-- par istog "imena" u obje grupe, link_fiba_youth postane dvosmislen (per_match/per_game > 1) i OBJE utakmice
-- tiho ostanu nepovezane, bez ikakve poruke.
--
-- Ispravka: kad je ime dvosmisleno, uzmi par (naša utakmica, FIBA utakmica) čiji je termin međusobno najbliži
-- (obostrano najbliži — "stable match" po vremenu), ali samo ako je razlika do 3h; inače ostaje nepovezano kao
-- i prije (ovo NIJE 100% pouzdano — ako FIBA termin kasni pa se dvije istoimene utakmice poklope na manje od 3h,
-- može spojiti pogrešan par; provjeri termin kad se tiebreak koristi). Siguran put je uvijek ručno: na /fiba/<id>
-- zalijepi link ili kod na pravu utakmicu preko "Poveži s našom utakmicom".
create or replace function public.link_fiba_youth()
returns integer
language plpgsql security definer set search_path = public, extensions
as $$
declare
  l record;
  n int := 0;
begin
  for l in
    with cand as (
      select m.id as match_id, g.id as game_id, g.status, c.category,
             abs(extract(epoch from (g.starts_at - m.starts_at))) as time_diff,
             row_number() over (partition by m.id order by abs(extract(epoch from (g.starts_at - m.starts_at)))) as match_rank,
             row_number() over (partition by g.id order by abs(extract(epoch from (g.starts_at - m.starts_at)))) as game_rank,
             count(*) over (partition by m.id) as per_match,
             count(*) over (partition by g.id) as per_game
        from public.matches m
        join public.competitions c on c.id = m.competition_id
        join public.teams h on h.id = m.home_team_id
        join public.teams a on a.id = m.away_team_id
        join public.fiba_games g
          on (g.category = c.category or g.category is null)
         and g.starts_at between m.starts_at - interval '1 day' and m.starts_at + interval '1 day'
         and public.fiba_team_word(g.home_name) = public.fiba_team_word(h.name)
         and public.fiba_team_word(g.away_name) = public.fiba_team_word(a.name)
       where c.category in ('pioniri', 'kadeti', 'juniori', 'pionirke', 'kadetkinje')
         and m.fiba_game_id is null
         and not exists (select 1 from public.matches x where x.fiba_game_id = g.id)
    )
    select match_id, game_id, status, category from cand
     where (per_match = 1 and per_game = 1)
        or (match_rank = 1 and game_rank = 1 and time_diff <= 10800)
  loop
    begin
      update public.matches set fiba_game_id = l.game_id where id = l.match_id and fiba_game_id is null;
      update public.fiba_games set category = coalesce(category, l.category) where id = l.game_id;
      if l.status not in ('SCHEDULED', 'READY') then perform public.fiba_pull_periods(l.match_id, l.game_id); end if;
      n := n + 1;
    exception when others then
      raise warning 'FIBA omladinska veza % (FIBA %): %', l.match_id, l.game_id, sqlerrm;
    end;
  end loop;
  return n;
end $$;

revoke all on function public.link_fiba_youth() from public, anon, authenticated;
