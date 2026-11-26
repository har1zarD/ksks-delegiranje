-- Lige saveza na FIBA LiveStats (takmičenje 50201: muška A1, A2 jug i A1 žene zajedno):
-- 1. Kategorija FIBA utakmice po ekipama: A2 jug je "a2", A1 žene "a1_z" (feed sve označi "a1", pa je A2 bila pod A1).
-- 2. Konačni rezultat se više ne briše kad feed za završenu utakmicu vrati prazan rezultat.
-- 3. Igrači A2 jug i A1 žene se vežu za svoju licencu (isti klub u tom takmičenju, isto ime uz sitne greške pri unosu
--    na FIBA LiveStats): ime s licence (s dijakriticima) i jedan ID igrača za sve varijante imena, pa statistika
--    sezone ne dijeli igrača na "Bucalovic" i "Bucalović". Fotografija se čita s licence.
-- 4. licenses.cutout_path: fotografija igrača bez pozadine (PNG) za slike za objavu.

create extension if not exists fuzzystrmatch with schema extensions;

alter table public.licenses add column if not exists cutout_path text;

alter table public.fiba_player_games add column if not exists license_id uuid references public.licenses (id) on delete set null;
create index if not exists fiba_player_games_license_id on public.fiba_player_games (license_id) where license_id is not null;

-- ───────── Kategorija ─────────

/**
 * Liga saveza iz para ekipa: obje ekipe iz A2 lige jug → "a2"; ženska ekipa (ŽKK/KŽK u nazivu ili klub koji ima samo
 * žensku ekipu) → "a1_z"; inače null (ostaje kategorija takmičenja, muška A1 i A2 sjever). "Konjic", "Čelik" i
 * "Brčko" su i muške ekipe, pa se ženska utakmica s njima prepoznaje po protivniku.
 */
create or replace function public.fiba_league_category(home text, away text)
returns text
language sql stable security definer set search_path = public
as $$
  select case
    when exists (select 1 from public.teams t where t.competition_id = 'd74bc0b4-99f1-4313-8c15-463f76d06764' and public.fiba_team_word(t.name) = public.fiba_team_word(home))
     and exists (select 1 from public.teams t where t.competition_id = 'd74bc0b4-99f1-4313-8c15-463f76d06764' and public.fiba_team_word(t.name) = public.fiba_team_word(away))
      then 'a2'
    when public.fiba_key(home) ~ '^(zkk|kzk)\s' or public.fiba_key(away) ~ '^(zkk|kzk)\s'
      or public.fiba_team_word(home) in ('g-stars', 'faze', 'bugojno', 'play', 'rmu', 'zenica')
      or public.fiba_team_word(away) in ('g-stars', 'faze', 'bugojno', 'play', 'rmu', 'zenica')
      then 'a1_z'
  end
$$;

-- ───────── Feed: kategorija po ekipama, rezultat završene utakmice se ne briše ─────────

create or replace function public.sync_fiba_feed()
returns integer
language plpgsql security definer set search_path = public, extensions
as $function$
declare
  c record;
  res extensions.http_response;
  n int := 0;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '8000');
  for c in select id, category from public.fiba_competitions where active loop
    begin
      res := extensions.http_get('https://fibalivestats.dcd.shared.geniussports.com/data/competition/' || c.id || '.json');
      if res.status <> 200 or jsonb_typeof(res.content::jsonb) <> 'array' then continue; end if;
      insert into public.fiba_games (id, competition_id, category, starts_at, status, live, home_name, away_name, home_logo, away_logo, home_score, away_score, updated_at)
      select
        (r ->> 'matchId')::bigint, c.id,
        coalesce(
          case when c.id = 50201 then public.fiba_league_category(r ->> 'homename', r ->> 'awayname') end,
          c.category,
          public.fiba_youth_category(r ->> 'homename', r ->> 'awayname')
        ),
        (r ->> 'matchTimeUTC')::timestamp at time zone 'UTC',
        r ->> 'matchStatus', (r ->> 'live') = '1',
        r ->> 'homename', r ->> 'awayname', nullif(r ->> 'homelogo', ''), nullif(r ->> 'awaylogo', ''),
        case when r ->> 'matchStatus' in ('SCHEDULED', 'READY') then null else nullif(r ->> 'homescore', '')::smallint end,
        case when r ->> 'matchStatus' in ('SCHEDULED', 'READY') then null else nullif(r ->> 'awayscore', '')::smallint end,
        now()
      from jsonb_array_elements(res.content::jsonb) r
      where r ->> 'matchTimeUTC' is not null
      on conflict (id) do update set
        starts_at = excluded.starts_at,
        home_name = excluded.home_name, away_name = excluded.away_name,
        home_logo = excluded.home_logo, away_logo = excluded.away_logo,
        -- Zakašnjeli feed (SCHEDULED/READY) ne briše rezultat koji je sync_fiba_stats već upisao iz utakmice
        status = case when fiba_games.status = 'COMPLETE' and excluded.status in ('SCHEDULED', 'READY') then fiba_games.status else excluded.status end,
        live = case when fiba_games.status = 'COMPLETE' and excluded.status in ('SCHEDULED', 'READY') then false else excluded.live end,
        -- Ni prazan rezultat u feedu za završenu utakmicu
        home_score = case when fiba_games.status = 'COMPLETE' and (excluded.status in ('SCHEDULED', 'READY') or excluded.home_score is null) then fiba_games.home_score else excluded.home_score end,
        away_score = case when fiba_games.status = 'COMPLETE' and (excluded.status in ('SCHEDULED', 'READY') or excluded.away_score is null) then fiba_games.away_score else excluded.away_score end,
        -- Kategorija omladinske lige se ne dira kad je već postavljena (uvoz); "a1" iz takmičenja 50201 ispravlja liga po ekipama
        category = case
          when fiba_games.category = 'a1' and excluded.category in ('a2', 'a1_z') then excluded.category
          else coalesce(fiba_games.category, excluded.category) end,
        -- Utakmica ispravljena poslije završetka (novi rezultat) dobija novi box score
        stats_at = case
          when fiba_games.status = 'COMPLETE' and excluded.status in ('SCHEDULED', 'READY') then fiba_games.stats_at
          when excluded.home_score is not null and excluded.away_score is not null
               and (fiba_games.home_score, fiba_games.away_score) is distinct from (excluded.home_score, excluded.away_score) then null
          else fiba_games.stats_at end,
        updated_at = now();
      n := n + 1;
    exception when others then
      raise warning 'FIBA feed %: %', c.id, sqlerrm;
    end;
  end loop;
  return n;
end $function$;

-- ───────── Licenca igrača ─────────

/** ID igrača vezanog za licencu: isti za sve varijante imena na FIBA LiveStats (12 hex znakova kao public.fiba_player_id) */
create or replace function public.fiba_license_player_id(license uuid)
returns text
language sql immutable parallel safe
as $$ select left(md5('licenca|' || license::text), 12) $$;

/**
 * Licenca FIBA igrača lige saveza: ekipa našeg takmičenja s istim nazivom (fiba_team_word), pa igrač tog kluba s
 * najbližim imenom (Levenshtein nad imenom bez dijakritika, i obrnut redoslijed imena i prezimena). Prihvata se samo
 * jedinstveno najbliže ime s najviše četvrtinom pogrešnih slova; "Čengićmirza Nedžib" (spojeno prezime) je isto ime.
 */
create or replace function public.fiba_license_for(category text, team text, first text, family text)
returns uuid
language sql stable security definer set search_path = public, extensions
as $$
  with comp as (
    select case category
      when 'a2' then 'd74bc0b4-99f1-4313-8c15-463f76d06764'::uuid
      when 'a1_z' then '443667aa-44cf-4c3c-9934-5b3d426c8de4'::uuid
    end as id
  ),
  own as (
    select t.id, t.club_id from public.teams t, comp
     where t.competition_id = comp.id and public.fiba_team_word(t.name) = public.fiba_team_word(team)
  ),
  one as (select * from own where (select count(*) from own) = 1),
  fiba as (
    select public.fiba_key(coalesce(first, '') || ' ' || coalesce(family, '')) as full,
           public.fiba_key(first) as f, public.fiba_key(family) as fam
  ),
  cand as (
    select l.id,
           least(
             levenshtein(fiba.full, public.fiba_key(l.first_name || ' ' || l.last_name)),
             levenshtein(fiba.full, public.fiba_key(l.last_name || ' ' || l.first_name)),
             case when fiba.f = public.fiba_key(l.first_name) and fiba.fam like public.fiba_key(l.last_name) || '_%' then 1 end
           ) as d,
           length(public.fiba_key(l.first_name || ' ' || l.last_name)) as len
      from public.licenses l, one, comp, fiba
     where l.competition_id = comp.id and l.club_id = one.club_id and l.kind = 'player'
       and (l.team_id is null or l.team_id = one.id)
  ),
  ranked as (select id, d, len, row_number() over (order by d) as rn, lead(d) over (order by d) as next_d from cand)
  select id from ranked where rn = 1 and d <= greatest(2, len / 4) and (next_d is null or next_d > d)
$$;

/**
 * Veže igrače liga saveza za licencu (samo još nevezane; `only_game` = jedna utakmica). Ime postaje ime s licence,
 * ID igrača ID licence (osim kad ga u istoj ekipi te utakmice već ima drugi red). Vraća broj vezanih.
 */
create or replace function public.fiba_link_licenses(only_game bigint default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  lic record;
  pid text;
  n int := 0;
begin
  for r in
    select p.game_id, p.side, p.player_id, p.team_name, p.first_name, p.family_name, g.category
      from public.fiba_player_games p
      join public.fiba_games g on g.id = p.game_id
     where p.license_id is null and g.category in ('a2', 'a1_z')
       and (only_game is null or p.game_id = only_game)
  loop
    select l.id, l.first_name, l.last_name into lic
      from public.licenses l where l.id = public.fiba_license_for(r.category, r.team_name, r.first_name, r.family_name);
    if lic.id is null then continue; end if;
    pid := public.fiba_license_player_id(lic.id);
    update public.fiba_player_games
       set license_id = lic.id,
           first_name = lic.first_name,
           family_name = lic.last_name,
           player_id = case
             when exists (select 1 from public.fiba_player_games x where x.game_id = r.game_id and x.side = r.side and x.player_id = pid) then player_id
             else pid end
     where game_id = r.game_id and side = r.side and player_id = r.player_id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Box score: odmah veže igrače za licence
create or replace function public.fiba_store_box_score(game bigint, d jsonb)
returns void
language plpgsql security definer set search_path = public
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
  perform public.fiba_link_licenses(game);
end $function$;

-- Statistika: na kraju veže i igrače čija je licenca dodana poslije utakmice
create or replace function public.sync_fiba_stats(max_games integer default 15)
returns integer
language plpgsql security definer set search_path = public, extensions
as $function$
declare
  g record;
  res extensions.http_response;
  d jsonb;
  ended boolean;
  n int := 0;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '8000');
  for g in
    select id, starts_at from public.fiba_games
     where stats_at is null
       and (status in ('COMPLETE', 'FINISHED', 'CONFIRMED') or starts_at < now() - interval '90 minutes')
     order by starts_at desc nulls last
     limit max_games
  loop
    begin
      res := extensions.http_get('https://fibalivestats.dcd.shared.geniussports.com/data/' || g.id || '/data.json');
      if res.status <> 200 then
        -- Utakmica koju FIBA nema (nikad pokrenuta): ne pokušava se ponovo
        if res.status = 404 and g.starts_at < now() - interval '2 days' then
          update public.fiba_games set stats_at = now() where id = g.id;
        end if;
        continue;
      end if;
      d := res.content::jsonb;
      if coalesce(jsonb_array_length(d -> 'pbp'), 0) = 0 then
        if g.starts_at < now() - interval '2 days' then update public.fiba_games set stats_at = now() where id = g.id; end if;
        continue;
      end if;
      ended := exists (select 1 from jsonb_array_elements(d -> 'pbp') e where e ->> 'actionType' = 'game' and e ->> 'subType' = 'end');
      -- Utakmica još traje: sljedeći krug
      if not ended and g.starts_at >= now() - interval '4 hours' then continue; end if;
      perform public.fiba_store_box_score(g.id, d);
      update public.fiba_games set
        stats_at = now(),
        status = 'COMPLETE',
        live = false,
        home_score = coalesce((d -> 'tm' -> '1' ->> 'score')::smallint, home_score),
        away_score = coalesce((d -> 'tm' -> '2' ->> 'score')::smallint, away_score)
      where id = g.id;
      n := n + 1;
    exception when others then
      raise warning 'FIBA box score %: %', g.id, sqlerrm;
    end;
  end loop;
  begin
    perform public.fiba_link_licenses();
  exception when others then
    raise warning 'FIBA licence: %', sqlerrm;
  end;
  return n;
end $function$;

-- Prosjeci sezone: licenca igrača (fotografija)
create or replace view public.fiba_player_season as
 SELECT p.player_id,
    g.category,
    (array_agg(p.first_name ORDER BY g.starts_at DESC))[1] AS first_name,
    (array_agg(p.family_name ORDER BY g.starts_at DESC))[1] AS family_name,
    (array_agg(p.number ORDER BY g.starts_at DESC))[1] AS number,
    (array_agg(p.team_name ORDER BY g.starts_at DESC))[1] AS team_name,
    count(*)::integer AS games,
    count(*) FILTER (WHERE p.starter)::integer AS starts,
    sum(p.seconds)::integer AS seconds,
    sum(p.pts)::integer AS pts,
    sum(p.fgm)::integer AS fgm,
    sum(p.fga)::integer AS fga,
    sum(p.tpm)::integer AS tpm,
    sum(p.tpa)::integer AS tpa,
    sum(p.ftm)::integer AS ftm,
    sum(p.fta)::integer AS fta,
    sum(p.oreb)::integer AS oreb,
    sum(p.dreb)::integer AS dreb,
    sum(p.reb)::integer AS reb,
    sum(p.ast)::integer AS ast,
    sum(p.stl)::integer AS stl,
    sum(p.blk)::integer AS blk,
    sum(p.tov)::integer AS tov,
    sum(p.pf)::integer AS pf,
    sum(p.fd)::integer AS fd,
    sum(p.plus_minus)::integer AS plus_minus,
    sum(p.eff)::integer AS eff,
    max(p.pts)::integer AS best_pts,
    fiba_season(g.starts_at) AS season,
    (array_agg(p.license_id ORDER BY g.starts_at DESC) FILTER (WHERE p.license_id IS NOT NULL))[1] AS license_id
   FROM fiba_player_games p
     JOIN fiba_games g ON g.id = p.game_id
  WHERE p.seconds > 0
  GROUP BY p.player_id, g.category, (fiba_season(g.starts_at));

-- ───────── Postojeći podaci ─────────

-- Kategorija utakmica lige saveza koje je feed označio kao A1
update public.fiba_games g
   set category = public.fiba_league_category(g.home_name, g.away_name)
 where g.competition_id = 50201 and g.category = 'a1'
   and public.fiba_league_category(g.home_name, g.away_name) is not null;

-- Završene utakmice bez rezultata (feed ga je obrisao): rezultat iz box scorea
update public.fiba_games g
   set home_score = h.score, away_score = a.score
  from public.fiba_team_games h, public.fiba_team_games a
 where h.game_id = g.id and h.side = 1 and a.game_id = g.id and a.side = 2
   and g.status = 'COMPLETE' and (g.home_score is null or g.away_score is null);

select public.fiba_link_licenses();
