-- Automatsko povezivanje omladinske lige (korisnik, 2026-10-30): isti princip kao link_fiba_a2/link_fiba_ksbih
-- (jednoznačan par po nazivu ekipa ±1 dan), ali za cijelu omladinsku ligu (Pioniri, Kadeti, Juniori, Pionirke,
-- Kadetkinje) umjesto jedne lige; fiba_games.category tu već dolazi iz naziva ekipe (fiba_youth_category), pa nema
-- potrebe za competition_id. Ne ide u pg_cron (korisnik hoće ovo samo na klik, ne automatski u pozadini) —
-- zove ga syncFiba() iz dugmeta "Sinhronizuj" na /fiba.

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
      select m.id as match_id, g.id as game_id, g.status,
             count(*) over (partition by m.id) as per_match,
             count(*) over (partition by g.id) as per_game
        from public.matches m
        join public.competitions c on c.id = m.competition_id
        join public.teams h on h.id = m.home_team_id
        join public.teams a on a.id = m.away_team_id
        join public.fiba_games g
          on g.category = c.category
         and g.starts_at between m.starts_at - interval '1 day' and m.starts_at + interval '1 day'
         and public.fiba_team_word(g.home_name) = public.fiba_team_word(h.name)
         and public.fiba_team_word(g.away_name) = public.fiba_team_word(a.name)
       where c.category in ('pioniri', 'kadeti', 'juniori', 'pionirke', 'kadetkinje')
         and m.fiba_game_id is null
         and not exists (select 1 from public.matches x where x.fiba_game_id = g.id)
    )
    select match_id, game_id, status from cand where per_match = 1 and per_game = 1
  loop
    begin
      update public.matches set fiba_game_id = l.game_id where id = l.match_id and fiba_game_id is null;
      if l.status not in ('SCHEDULED', 'READY') then perform public.fiba_pull_periods(l.match_id, l.game_id); end if;
      n := n + 1;
    exception when others then
      raise warning 'FIBA omladinska veza % (FIBA %): %', l.match_id, l.game_id, sqlerrm;
    end;
  end loop;
  return n;
end $$;

revoke all on function public.link_fiba_youth() from public, anon, authenticated;
