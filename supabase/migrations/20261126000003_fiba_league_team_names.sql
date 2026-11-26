-- Lige saveza (A2 jug, A1 žene) na FIBA LiveStats: ista ekipa dolazi pod više naziva ("POINT U16" i "POINT RICHMOND PARK",
-- "OKK Celik" i "OKK Čelik"), pa se u tabeli, statistici ekipa i na stranici ekipe cijepala u dvije. Naziv FIBA ekipe
-- postaje naziv naše ekipe u takmičenju (ista riječ kluba, fiba_team_word), u utakmicama i u box scoreu.
-- ID igrača se ne mijenja (računa se pri upisu iz FIBA naziva, a igrač s licencom ima ID licence).

/** Naš naziv ekipe lige saveza za FIBA naziv (null: nije liga saveza ili riječ kluba nije jednoznačna) */
drop function if exists public.fiba_league_team(text, text);
create function public.fiba_league_team(league text, fiba_name text)
returns text
language sql stable security definer set search_path = public
as $$
  select min(t.name)
    from public.teams t
   where t.competition_id = case league
           when 'a2' then 'd74bc0b4-99f1-4313-8c15-463f76d06764'::uuid
           when 'a1_z' then '443667aa-44cf-4c3c-9934-5b3d426c8de4'::uuid
         end
     and public.fiba_team_word(t.name) = public.fiba_team_word(fiba_name)
  having count(*) = 1
$$;

/** Nazivi ekipa liga saveza u utakmicama i box scoreu (`only_game` = jedna utakmica). Vraća broj izmijenjenih utakmica. */
create or replace function public.fiba_league_names(only_game bigint default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  n int;
begin
  update public.fiba_games g
     set home_name = coalesce(public.fiba_league_team(g.category, g.home_name), g.home_name),
         away_name = coalesce(public.fiba_league_team(g.category, g.away_name), g.away_name)
   where g.category in ('a2', 'a1_z') and (only_game is null or g.id = only_game)
     and (g.home_name is distinct from coalesce(public.fiba_league_team(g.category, g.home_name), g.home_name)
       or g.away_name is distinct from coalesce(public.fiba_league_team(g.category, g.away_name), g.away_name));
  get diagnostics n = row_count;

  update public.fiba_team_games t
     set team_name = public.fiba_league_team(g.category, t.team_name)
    from public.fiba_games g
   where g.id = t.game_id and g.category in ('a2', 'a1_z') and (only_game is null or g.id = only_game)
     and public.fiba_league_team(g.category, t.team_name) is distinct from t.team_name
     and public.fiba_league_team(g.category, t.team_name) is not null;

  update public.fiba_player_games p
     set team_name = public.fiba_league_team(g.category, p.team_name)
    from public.fiba_games g
   where g.id = p.game_id and g.category in ('a2', 'a1_z') and (only_game is null or g.id = only_game)
     and public.fiba_league_team(g.category, p.team_name) is distinct from p.team_name
     and public.fiba_league_team(g.category, p.team_name) is not null;
  return n;
end $$;

-- Feed: naziv ekipe lige saveza odmah naš (i kad feed ponovo javi utakmicu)
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
        (r ->> 'matchId')::bigint, c.id, k.category,
        (r ->> 'matchTimeUTC')::timestamp at time zone 'UTC',
        r ->> 'matchStatus', (r ->> 'live') = '1',
        coalesce(public.fiba_league_team(k.category, r ->> 'homename'), r ->> 'homename'),
        coalesce(public.fiba_league_team(k.category, r ->> 'awayname'), r ->> 'awayname'),
        nullif(r ->> 'homelogo', ''), nullif(r ->> 'awaylogo', ''),
        case when r ->> 'matchStatus' in ('SCHEDULED', 'READY') then null else nullif(r ->> 'homescore', '')::smallint end,
        case when r ->> 'matchStatus' in ('SCHEDULED', 'READY') then null else nullif(r ->> 'awayscore', '')::smallint end,
        now()
      from jsonb_array_elements(res.content::jsonb) r
      cross join lateral (
        select coalesce(
          case when c.id = 50201 then public.fiba_league_category(r ->> 'homename', r ->> 'awayname') end,
          c.category,
          public.fiba_youth_category(r ->> 'homename', r ->> 'awayname')
        ) as category
      ) k
      where r ->> 'matchTimeUTC' is not null
      on conflict (id) do update set
        starts_at = excluded.starts_at,
        -- Naziv koji je liga saveza već dobila (npr. utakmica povezana s našom) ostaje naš
        home_name = coalesce(public.fiba_league_team(fiba_games.category, excluded.home_name), excluded.home_name),
        away_name = coalesce(public.fiba_league_team(fiba_games.category, excluded.away_name), excluded.away_name),
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
  -- Utakmica koja je "a1" postala liga saveza tek u ovom krugu (on conflict čita staru kategoriju)
  perform public.fiba_league_names();
  return n;
end $function$;

-- Licence: poslije veze i nazivi ekipa (fiba_store_box_score i sync_fiba_stats zovu fiba_link_licenses)
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
  perform public.fiba_league_names(only_game);
  return n;
end $$;

select public.fiba_league_names();
