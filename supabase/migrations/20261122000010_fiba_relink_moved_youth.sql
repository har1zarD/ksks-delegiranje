-- Omladinske utakmice i FIBA (korisnik, 22.11.2026.):
-- 1) Pomjerena utakmica ostajala je vezana za FIBA utakmicu prvobitnog termina koja nikad nije odigrana (Pioniri G2
--    14.11. → 22.11. i dalje na FIBA 2955043–45 od 14.11.). Ako statističar napravi novu FIBA utakmicu, naša se ne bi
--    povezala i ne bi imala rezultat uživo. Veza na neodigranu FIBA utakmicu udaljenu više od dana se sada skida,
--    pa link_fiba_youth poveže pravu (istu, ako FIBA samo pomjeri termin).
-- 2) Povezivanje (feed + veze) ponovo svake 2 minute, da rezultat uživo krene odmah s početkom utakmice;
--    box score (sync_fiba_stats) ostaje svakih 10 minuta.

create or replace function public.link_fiba_youth()
returns integer
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  l record;
  n int := 0;
begin
  -- Veza na FIBA utakmicu koja nije počela, a termin naše utakmice je pomjeren za više od dana: skida se
  update public.matches m set fiba_game_id = null, fiba_swapped = false
    from public.competitions c, public.fiba_games g
   where c.id = m.competition_id
     and c.category in ('pioniri', 'kadeti', 'juniori', 'pionirke', 'kadetkinje')
     and g.id = m.fiba_game_id
     and m.status in ('scheduled', 'postponed')
     and g.status in ('SCHEDULED', 'READY') and g.home_score is null
     and abs(extract(epoch from (g.starts_at - m.starts_at))) > 86400
     and not exists (select 1 from public.match_periods mp where mp.match_id = m.id);

  for l in
    with pair as (
      select m.id as match_id, g.id as game_id, g.status, c.category,
             abs(extract(epoch from (g.starts_at - m.starts_at))) as time_diff,
             not (public.fiba_team_word(g.home_name) = public.fiba_team_word(h.name)
                  and public.fiba_team_word(g.away_name) = public.fiba_team_word(a.name)) as swapped
        from public.matches m
        join public.competitions c on c.id = m.competition_id
        join public.teams h on h.id = m.home_team_id
        join public.teams a on a.id = m.away_team_id
        join public.fiba_games g
          on (g.category = c.category or g.category is null)
         and g.starts_at between m.starts_at - interval '1 day' and m.starts_at + interval '1 day'
         and ((public.fiba_team_word(g.home_name) = public.fiba_team_word(h.name) and public.fiba_team_word(g.away_name) = public.fiba_team_word(a.name))
           or (public.fiba_team_word(g.home_name) = public.fiba_team_word(a.name) and public.fiba_team_word(g.away_name) = public.fiba_team_word(h.name)))
       where c.category in ('pioniri', 'kadeti', 'juniori', 'pionirke', 'kadetkinje')
         and m.fiba_game_id is null
         and not exists (select 1 from public.matches x where x.fiba_game_id = g.id)
    ),
    cand as (
      select pair.*,
             row_number() over (partition by match_id order by time_diff, swapped) as match_rank,
             row_number() over (partition by game_id order by time_diff, swapped) as game_rank,
             count(*) over (partition by match_id) as per_match,
             count(*) over (partition by game_id) as per_game
        from pair
    )
    select match_id, game_id, status, category, swapped from cand
     where (per_match = 1 and per_game = 1)
        or (match_rank = 1 and game_rank = 1 and time_diff <= 10800)
  loop
    begin
      update public.matches set fiba_game_id = l.game_id, fiba_swapped = l.swapped where id = l.match_id and fiba_game_id is null;
      update public.fiba_games set category = coalesce(category, l.category) where id = l.game_id;
      if l.status not in ('SCHEDULED', 'READY') then perform public.fiba_pull_periods(l.match_id, l.game_id); end if;
      n := n + 1;
    exception when others then
      raise warning 'FIBA omladinska veza % (FIBA %): %', l.match_id, l.game_id, sqlerrm;
    end;
  end loop;
  return n;
end $function$;

revoke all on function public.link_fiba_youth() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname in ('sync-fiba-stats', 'sync-fiba-feed');
end $$;

-- Feed i veze svake 2 minute (lagano: po jedan JSON po takmičenju)
select cron.schedule(
  'sync-fiba-feed', '*/2 * * * *',
  $job$ select public.sync_fiba_feed(); select public.link_fiba_ksbih(); select public.link_fiba_youth() $job$
);

-- Box score završenih utakmica svakih 10 minuta
select cron.schedule('sync-fiba-stats', '*/10 * * * *', $job$ select public.sync_fiba_stats(30) $job$);

select public.link_fiba_youth();

-- 3) Stranica FIBA uživo je pri svakom otvaranju upisivala sirovi feed u fiba_games i vraćala završene utakmice na
--    SCHEDULED bez rezultata (src/lib/data/fiba.ts više ne piše u bazu). Ponovo: rezultat iz box scorea (zadnjih 30 dana).
update public.fiba_games g set
  status = 'COMPLETE', live = false,
  home_score = h.score, away_score = a.score
from public.fiba_team_games h, public.fiba_team_games a
where h.game_id = g.id and h.side = 1 and a.game_id = g.id and a.side = 2
  and g.stats_at is not null and g.starts_at > now() - interval '30 days'
  and g.status in ('SCHEDULED', 'READY') and g.home_score is null
  and h.score + a.score > 0;
