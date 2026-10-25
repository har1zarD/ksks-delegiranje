-- A2 liga jug KSBiH na FIBA LiveStats (korisnik, 2026-10-25): KSBiH vodi A2 utakmice u istom FIBA takmičenju kao A1 ligu (50201),
-- a feed nema podatak o grupi. Naša A2 utakmica se zato sama povezuje s FIBA utakmicom istog dana (±1 dan) i istih klubova;
-- povezana dobija četvrtine odmah (i već odigrana), dalje ih prepisuje sync_fiba_periods. FIBA utakmica dobija kategoriju A2,
-- pa A2 ima svoj spisak i statistiku (feed kategoriju poslije ne mijenja). Radi u poslu sync-fiba-stats (svake 2 minute).

-- Klub iz naziva ekipe za poređenje: "KK Point - Richmond Park" i "POINT U16" → "point", "KK Mladost Ilijaš" → "mladost"
create or replace function public.fiba_team_word(t text)
returns text
language sql immutable parallel safe
as $$ select split_part(regexp_replace(public.fiba_key(t), '^(kk|okk|ukk|kzk|zkk|kos)\s+', ''), ' ', 1) $$;

-- Četvrtine jedne FIBA utakmice u našu utakmicu (kao sync_fiba_periods, ali za bilo koji termin); true = upisano
create or replace function public.fiba_pull_periods(match uuid, game bigint)
returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
declare
  res extensions.http_response;
  d jsonb;
  cur int;
  p int;
  h int;
  a int;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '8000');
  res := extensions.http_get('https://fibalivestats.dcd.shared.geniussports.com/data/' || game || '/data.json');
  if res.status <> 200 then return false; end if;
  d := res.content::jsonb;
  if coalesce(jsonb_array_length(d -> 'pbp'), 0) = 0 then return false; end if;
  cur := least(coalesce((d ->> 'period')::int, 0), 12);
  for p in 1 .. cur loop
    h := (d -> 'tm' -> '1' ->> ('p' || p || '_score'))::int;
    a := (d -> 'tm' -> '2' ->> ('p' || p || '_score'))::int;
    if h is null or a is null then continue; end if;
    insert into public.match_periods (match_id, period, home_points, away_points, updated_at)
    values (match, p, h, a, now())
    on conflict (match_id, period) do update
      set home_points = excluded.home_points, away_points = excluded.away_points, updated_at = now()
      where (match_periods.home_points, match_periods.away_points) is distinct from (excluded.home_points, excluded.away_points);
  end loop;
  return true;
exception when others then
  raise warning 'FIBA četvrtine % (FIBA %): %', match, game, sqlerrm;
  return false;
end $$;

-- Povezuje A2 utakmice bez FIBA utakmice: samo jednoznačan par (jedna FIBA utakmica za našu i obrnuto); vraća broj povezanih
create or replace function public.link_fiba_a2()
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
        join public.teams h on h.id = m.home_team_id
        join public.teams a on a.id = m.away_team_id
        join public.fiba_games g
          on g.competition_id = 50201
         and g.starts_at between m.starts_at - interval '1 day' and m.starts_at + interval '1 day'
         and public.fiba_team_word(g.home_name) = public.fiba_team_word(h.name)
         and public.fiba_team_word(g.away_name) = public.fiba_team_word(a.name)
       where m.competition_id = 'd74bc0b4-99f1-4313-8c15-463f76d06764' -- A2 liga jug KSBiH
         and m.fiba_game_id is null
         and not exists (select 1 from public.matches x where x.fiba_game_id = g.id)
    )
    select match_id, game_id, status from cand where per_match = 1 and per_game = 1
  loop
    begin
      update public.matches set fiba_game_id = l.game_id where id = l.match_id and fiba_game_id is null;
      update public.fiba_games set category = 'a2' where id = l.game_id;
      if l.status not in ('SCHEDULED', 'READY') then perform public.fiba_pull_periods(l.match_id, l.game_id); end if;
      n := n + 1;
    exception when others then
      raise warning 'FIBA A2 veza % (FIBA %): %', l.match_id, l.game_id, sqlerrm;
    end;
  end loop;
  return n;
end $$;

revoke all on function public.fiba_pull_periods(uuid, bigint) from public, anon, authenticated;
revoke all on function public.link_fiba_a2() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'sync-fiba-stats';
end $$;

select cron.schedule('sync-fiba-stats', '*/2 * * * *', $job$ select public.sync_fiba_feed(); select public.link_fiba_a2(); select public.sync_fiba_stats(15) $job$);
