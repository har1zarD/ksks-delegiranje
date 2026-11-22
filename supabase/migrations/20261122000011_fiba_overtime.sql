-- Produžeci s FIBA LiveStats (korisnik, 22.11.2026.): Bošnjak – Mladost (Pioniri G1, 5. kolo) je u aplikaciji ostala
-- 55:55, a završila je 69:60 poslije produžetka. FIBA produžetke ne vodi kao p5_score, p6_score…: daje samo njihov zbir
-- (ot_score), a period ponovo broji od 1 (periodType OVERTIME). Sync je čitao samo p1_score…p4_score, pa produžetak
-- nije ulazio ni u rezultat utakmice (match_periods) ni u četvrtine FIBA statistike (fiba_team_games.periods).
-- Sada: produžeci su periodi 5, 6… Raniji produžeci se čitaju iz toka utakmice (rezultat na kraju tog produžetka),
-- zadnji je ostatak zbira, pa je zbir perioda uvijek konačni rezultat.

create or replace function public.fiba_periods(d jsonb, side int)
returns smallint[]
language plpgsql immutable set search_path = public
as $$
declare
  t jsonb := d -> 'tm' -> side::text;
  periods smallint[] := '{}';
  i int := 1;
  regular int := 0;
  overtimes int;
  total int;
  spent int := 0;
  reached int;
  ended int;
  points int;
begin
  if t is null then return periods; end if;
  while t ? ('p' || i || '_score') loop
    periods := periods || coalesce((t ->> ('p' || i || '_score'))::smallint, 0::smallint);
    regular := regular + periods[i];
    i := i + 1;
  end loop;

  select coalesce(max((e ->> 'period')::int), 0) into overtimes
    from jsonb_array_elements(coalesce(d -> 'pbp', '[]'::jsonb)) e
   where e ->> 'periodType' = 'OVERTIME';
  if d ->> 'periodType' = 'OVERTIME' then overtimes := greatest(overtimes, coalesce((d ->> 'period')::int, 1)); end if;
  -- match_periods prima najviše 12 perioda
  overtimes := least(overtimes, 12 - (i - 1));
  if overtimes <= 0 then return periods; end if;

  total := coalesce((t ->> 'ot_score')::int, coalesce((t ->> 'score')::int, regular) - regular);
  reached := regular;
  for k in 1 .. overtimes loop
    if k < overtimes then
      select max(nullif(e ->> ('s' || side), '')::int) into ended
        from jsonb_array_elements(d -> 'pbp') e
       where e ->> 'periodType' = 'OVERTIME' and (e ->> 'period')::int = k;
      points := greatest(coalesce(ended, reached) - reached, 0);
      reached := reached + points;
    else
      points := greatest(total - spent, 0);
    end if;
    spent := spent + points;
    periods := periods || points::smallint;
  end loop;
  return periods;
end $$;

revoke all on function public.fiba_periods(jsonb, int) from public, anon, authenticated;

create or replace function public.sync_fiba_periods()
returns integer
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  m record;
  res extensions.http_response;
  d jsonb;
  cur int;
  p int;
  hp smallint[];
  ap smallint[];
  n int := 0;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '8000');
  for m in
    select id, fiba_game_id, fiba_swapped, status from public.matches
     where fiba_game_id is not null
       and (
         (status in ('scheduled', 'live', 'finished') and starts_at between now() - interval '6 hours' and now() + interval '30 minutes')
         or (status = 'live' and starts_at > now() - interval '1 day')
       )
       -- Četvrtine koje je ispravio savez (updated_by postavljen) FIBA više ne prepisuje
       and not exists (select 1 from public.match_periods mp where mp.match_id = matches.id and mp.updated_by is not null)
  loop
    begin
      res := extensions.http_get('https://fibalivestats.dcd.shared.geniussports.com/data/' || m.fiba_game_id || '/data.json');
      if res.status <> 200 then continue; end if;
      d := res.content::jsonb;
      -- Utakmica još nije počela u LiveStats (nema akcija)
      if coalesce(jsonb_array_length(d -> 'pbp'), 0) = 0 then continue; end if;
      hp := public.fiba_periods(d, case when m.fiba_swapped then 2 else 1 end);
      ap := public.fiba_periods(d, case when m.fiba_swapped then 1 else 2 end);
      -- Regularni dio: do tekuće četvrtine. Produžetak: sve četvrtine i svi produžeci (FIBA tada period broji od 1).
      cur := case when d ->> 'periodType' = 'OVERTIME' then 12 else least(coalesce((d ->> 'period')::int, 0), 12) end;
      for p in 1 .. least(cur, coalesce(array_length(hp, 1), 0), coalesce(array_length(ap, 1), 0)) loop
        insert into public.match_periods (match_id, period, home_points, away_points, updated_at)
        values (m.id, p, hp[p], ap[p], now())
        on conflict (match_id, period) do update
          set home_points = excluded.home_points, away_points = excluded.away_points, updated_at = now()
          where (match_periods.home_points, match_periods.away_points) is distinct from (excluded.home_points, excluded.away_points);
      end loop;
      if exists (select 1 from jsonb_array_elements(d -> 'pbp') e where e ->> 'actionType' = 'game' and e ->> 'subType' = 'end') then
        update public.matches set status = 'finished' where id = m.id and status <> 'finished';
      elsif m.status = 'scheduled' then
        update public.matches set status = 'live' where id = m.id;
      end if;
      n := n + 1;
    exception when others then
      raise warning 'FIBA sync % (FIBA %): %', m.id, m.fiba_game_id, sqlerrm;
    end;
  end loop;
  return n;
end $function$;

revoke all on function public.sync_fiba_periods() from public, anon, authenticated;

create or replace function public.fiba_pull_periods(match uuid, game bigint)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  res extensions.http_response;
  d jsonb;
  cur int;
  p int;
  hp smallint[];
  ap smallint[];
  swapped boolean;
begin
  select m.fiba_swapped into swapped from public.matches m where m.id = match;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '8000');
  res := extensions.http_get('https://fibalivestats.dcd.shared.geniussports.com/data/' || game || '/data.json');
  if res.status <> 200 then return false; end if;
  d := res.content::jsonb;
  if coalesce(jsonb_array_length(d -> 'pbp'), 0) = 0 then return false; end if;
  hp := public.fiba_periods(d, case when swapped then 2 else 1 end);
  ap := public.fiba_periods(d, case when swapped then 1 else 2 end);
  cur := case when d ->> 'periodType' = 'OVERTIME' then 12 else least(coalesce((d ->> 'period')::int, 0), 12) end;
  for p in 1 .. least(cur, coalesce(array_length(hp, 1), 0), coalesce(array_length(ap, 1), 0)) loop
    insert into public.match_periods (match_id, period, home_points, away_points, updated_at)
    values (match, p, hp[p], ap[p], now())
    on conflict (match_id, period) do update
      set home_points = excluded.home_points, away_points = excluded.away_points, updated_at = now()
      where (match_periods.home_points, match_periods.away_points) is distinct from (excluded.home_points, excluded.away_points);
  end loop;
  return true;
exception when others then
  raise warning 'FIBA četvrtine % (FIBA %): %', match, game, sqlerrm;
  return false;
end $function$;

create or replace function public.fiba_store_box_score(game bigint, d jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s int;
  t jsonb;
  pl jsonb;
begin
  delete from public.fiba_player_games where game_id = game;
  delete from public.fiba_team_games where game_id = game;
  for s in 1 .. 2 loop
    t := d -> 'tm' -> s::text;
    if t is null then continue; end if;
    insert into public.fiba_team_games (
      game_id, side, team_name, club_key, coach, score, periods,
      pts, fgm, fga, tpm, tpa, ftm, fta, oreb, dreb, reb, ast, stl, blk, tov, pf, eff,
      paint, fast_break, second_chance, from_turnovers, bench, biggest_lead, biggest_run, lead_changes, times_tied
    ) values (
      game, s, t ->> 'name', public.fiba_club_key(t ->> 'name'), nullif(t ->> 'coach', ''), coalesce((t ->> 'score')::smallint, 0), public.fiba_periods(d, s),
      coalesce((t ->> 'tot_sPoints')::smallint, 0), coalesce((t ->> 'tot_sFieldGoalsMade')::smallint, 0), coalesce((t ->> 'tot_sFieldGoalsAttempted')::smallint, 0),
      coalesce((t ->> 'tot_sThreePointersMade')::smallint, 0), coalesce((t ->> 'tot_sThreePointersAttempted')::smallint, 0),
      coalesce((t ->> 'tot_sFreeThrowsMade')::smallint, 0), coalesce((t ->> 'tot_sFreeThrowsAttempted')::smallint, 0),
      coalesce((t ->> 'tot_sReboundsOffensive')::smallint, 0), coalesce((t ->> 'tot_sReboundsDefensive')::smallint, 0), coalesce((t ->> 'tot_sReboundsTotal')::smallint, 0),
      coalesce((t ->> 'tot_sAssists')::smallint, 0), coalesce((t ->> 'tot_sSteals')::smallint, 0), coalesce((t ->> 'tot_sBlocks')::smallint, 0),
      coalesce((t ->> 'tot_sTurnovers')::smallint, 0), coalesce((t ->> 'tot_sFoulsPersonal')::smallint, 0), coalesce((t ->> 'tot_eff_1')::smallint, 0),
      (t ->> 'tot_sPointsInThePaint')::smallint, (t ->> 'tot_sPointsFastBreak')::smallint, (t ->> 'tot_sPointsSecondChance')::smallint,
      (t ->> 'tot_sPointsFromTurnovers')::smallint, (t ->> 'tot_sBenchPoints')::smallint, (t ->> 'tot_sBiggestLead')::smallint,
      (t ->> 'tot_sBiggestScoringRun')::smallint, (t ->> 'tot_sLeadChanges')::smallint, (t ->> 'tot_sTimesScoresLevel')::smallint
    );
    for pl in select value from jsonb_each(coalesce(t -> 'pl', '{}'::jsonb)) loop
      insert into public.fiba_player_games (
        game_id, side, player_id, team_name, first_name, family_name, number, position, starter, captain, seconds,
        pts, fgm, fga, tpm, tpa, ftm, fta, oreb, dreb, reb, ast, stl, blk, tov, pf, fd, plus_minus, eff
      ) values (
        game, s, public.fiba_player_id(t ->> 'name', pl ->> 'firstName', pl ->> 'familyName'), t ->> 'name',
        nullif(pl ->> 'firstName', ''), nullif(pl ->> 'familyName', ''), nullif(pl ->> 'shirtNumber', ''), nullif(pl ->> 'playingPosition', ''),
        coalesce((pl ->> 'starter')::int, 0) = 1, coalesce((pl ->> 'captain')::int, 0) = 1, public.fiba_seconds(pl ->> 'sMinutes'),
        coalesce((pl ->> 'sPoints')::smallint, 0), coalesce((pl ->> 'sFieldGoalsMade')::smallint, 0), coalesce((pl ->> 'sFieldGoalsAttempted')::smallint, 0),
        coalesce((pl ->> 'sThreePointersMade')::smallint, 0), coalesce((pl ->> 'sThreePointersAttempted')::smallint, 0),
        coalesce((pl ->> 'sFreeThrowsMade')::smallint, 0), coalesce((pl ->> 'sFreeThrowsAttempted')::smallint, 0),
        coalesce((pl ->> 'sReboundsOffensive')::smallint, 0), coalesce((pl ->> 'sReboundsDefensive')::smallint, 0), coalesce((pl ->> 'sReboundsTotal')::smallint, 0),
        coalesce((pl ->> 'sAssists')::smallint, 0), coalesce((pl ->> 'sSteals')::smallint, 0), coalesce((pl ->> 'sBlocks')::smallint, 0),
        coalesce((pl ->> 'sTurnovers')::smallint, 0), coalesce((pl ->> 'sFoulsPersonal')::smallint, 0), coalesce((pl ->> 'sFoulsOn')::smallint, 0),
        coalesce((pl ->> 'sPlusMinusPoints')::smallint, 0), coalesce((pl ->> 'eff_1')::smallint, 0)
      )
      -- Dva igrača istog imena u ekipi: drugi se ne upisuje (rijetko; ID je klub + ime)
      on conflict (game_id, side, player_id) do nothing;
    end loop;
  end loop;
end $function$;

-- Odmah: naše utakmice čiji se rezultat razlikuje od završene FIBA utakmice (produžetak koji nije upisan), bez onih
-- koje je ispravio savez
select m.id, public.fiba_pull_periods(m.id, m.fiba_game_id)
  from public.matches m
  join public.fiba_games g on g.id = m.fiba_game_id
 where g.status = 'COMPLETE' and m.status = 'finished' and g.home_score is not null and g.away_score is not null
   and (m.home_score, m.away_score) is distinct from
       (case when m.fiba_swapped then g.away_score else g.home_score end::numeric, case when m.fiba_swapped then g.home_score else g.away_score end::numeric)
   and not exists (select 1 from public.match_periods mp where mp.match_id = m.id and mp.updated_by is not null);

-- FIBA statistika: utakmice čiji zbir četvrtina nije rezultat (produžeci) dobijaju novi box score
update public.fiba_games g set stats_at = null
 where exists (
   select 1 from public.fiba_team_games t
    where t.game_id = g.id and t.score <> (select coalesce(sum(x), 0) from unnest(t.periods) x)
 );

select public.sync_fiba_stats(30);
