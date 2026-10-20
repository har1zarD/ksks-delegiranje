-- FIBA statistika (korisnik, 2026-10-20): historija i prosjeci igrača, tabela, lideri i statistika ekipa po kategoriji.
-- Box score svake završene FIBA utakmice se jednom upiše u bazu (fiba_player_games, fiba_team_games), pa stranice
-- igrača, ekipa, tabele i lidera ne zavise od FIBA LiveStats. Posao živi u bazi (pg_cron + http), kao sync_fiba_periods:
--  * feed aktivnih takmičenja → fiba_games (nove utakmice, rezultat, status; kategorija omladinske lige iz naziva ekipe)
--  * završene utakmice bez box scorea → data.json → igrači i ekipe (do 15 utakmica po krugu)
-- Igrač = klub + ime i prezime (FIBA nema ID igrača u javnim podacima); klub iz fiba_team_aliases (iste kao FIBA_CLUBS
-- u kodu), inače naziv ekipe bez oznake uzrasta (U14, WU16…), pa je igrač isti u kadetima i juniorima svog kluba.

-- "Koš  U16" → "kos u16": mala slova, bez naših dijakritika, jedan razmak (isto radi fibaKey u src/lib/fiba-stats.ts)
create or replace function public.fiba_key(t text)
returns text
language sql immutable parallel safe
as $$ select btrim(regexp_replace(lower(translate(coalesce(t, ''), 'ČĆŽŠĐčćžšđ', 'CCZSDcczsd')), '\s+', ' ', 'g')) $$;

create table public.fiba_team_aliases (
  team_key text primary key, -- fiba_key(naziv FIBA ekipe)
  club_key text not null     -- naš klub (clubs.id) ili logo kluba kojeg nemamo
);
alter table public.fiba_team_aliases enable row level security;

-- Klub FIBA ekipe: alias, inače naziv bez oznake uzrasta
create or replace function public.fiba_club_key(team text)
returns text
language sql stable parallel safe
as $$
  select coalesce(
    (select club_key from public.fiba_team_aliases where team_key = public.fiba_key(team)),
    regexp_replace(public.fiba_key(team), '\s+w?u\d{1,2}$', '')
  )
$$;

-- ID igrača u URL-u: 12 heks znakova (isto radi fibaPlayerId u src/lib/fiba-stats.ts)
create or replace function public.fiba_player_id(team text, first_name text, family_name text)
returns text
language sql stable parallel safe
as $$ select substr(md5(public.fiba_club_key(team) || '|' || public.fiba_key(coalesce(first_name, '') || ' ' || coalesce(family_name, ''))), 1, 12) $$;

-- Kategorija omladinske lige iz naziva ekipe (KK Koš U16 → kadeti), kad je uvoz nije postavio
create or replace function public.fiba_youth_category(home text, away text)
returns text
language sql immutable parallel safe
as $$
  select case
    when m ~ '\mwu1[34]\M' then 'pionirke'
    when m ~ '\mwu1[56]\M' then 'kadetkinje'
    when m ~ '\mu1[34]\M' then 'pioniri'
    when m ~ '\mu1[56]\M' then 'kadeti'
    when m ~ '\mu1[78]\M' then 'juniori'
  end
  from (select public.fiba_key(home) || ' ' || public.fiba_key(away) as m) x
$$;

alter table public.fiba_games add column stats_at timestamptz; -- box score upisan (null = još nije)

-- Statistika jedne ekipe ili igrača na utakmici
create table public.fiba_team_games (
  game_id        bigint not null references public.fiba_games (id) on delete cascade,
  side           smallint not null check (side in (1, 2)), -- 1 domaćin, 2 gost
  team_name      text not null,
  club_key       text not null,
  coach          text,
  score          smallint not null,
  periods        smallint[] not null default '{}',
  pts smallint not null default 0, fgm smallint not null default 0, fga smallint not null default 0,
  tpm smallint not null default 0, tpa smallint not null default 0, ftm smallint not null default 0, fta smallint not null default 0,
  oreb smallint not null default 0, dreb smallint not null default 0, reb smallint not null default 0,
  ast smallint not null default 0, stl smallint not null default 0, blk smallint not null default 0,
  tov smallint not null default 0, pf smallint not null default 0, eff smallint not null default 0,
  paint smallint, fast_break smallint, second_chance smallint, from_turnovers smallint, bench smallint,
  biggest_lead smallint, biggest_run smallint, lead_changes smallint, times_tied smallint,
  primary key (game_id, side)
);

create table public.fiba_player_games (
  game_id     bigint not null references public.fiba_games (id) on delete cascade,
  side        smallint not null check (side in (1, 2)),
  player_id   text not null,
  team_name   text not null,
  first_name  text,
  family_name text,
  number      text,
  position    text,
  starter     boolean not null default false,
  captain     boolean not null default false,
  seconds     integer not null default 0,
  pts smallint not null default 0, fgm smallint not null default 0, fga smallint not null default 0,
  tpm smallint not null default 0, tpa smallint not null default 0, ftm smallint not null default 0, fta smallint not null default 0,
  oreb smallint not null default 0, dreb smallint not null default 0, reb smallint not null default 0,
  ast smallint not null default 0, stl smallint not null default 0, blk smallint not null default 0,
  tov smallint not null default 0, pf smallint not null default 0, fd smallint not null default 0,
  plus_minus smallint not null default 0, eff smallint not null default 0,
  primary key (game_id, side, player_id)
);
create index fiba_player_games_player on public.fiba_player_games (player_id);
create index fiba_games_category on public.fiba_games (category, starts_at desc);

-- Samo servisni klijent
alter table public.fiba_team_games enable row level security;
alter table public.fiba_player_games enable row level security;

-- Prosjeci igrača po kategoriji (samo igrači koji su igrali: minute > 0); ime, broj i ekipa sa zadnje utakmice
create view public.fiba_player_season with (security_invoker = true) as
select
  p.player_id,
  g.category,
  (array_agg(p.first_name order by g.starts_at desc))[1] as first_name,
  (array_agg(p.family_name order by g.starts_at desc))[1] as family_name,
  (array_agg(p.number order by g.starts_at desc))[1] as number,
  (array_agg(p.team_name order by g.starts_at desc))[1] as team_name,
  count(*)::int as games,
  count(*) filter (where p.starter)::int as starts,
  sum(p.seconds)::int as seconds,
  sum(p.pts)::int as pts, sum(p.fgm)::int as fgm, sum(p.fga)::int as fga,
  sum(p.tpm)::int as tpm, sum(p.tpa)::int as tpa, sum(p.ftm)::int as ftm, sum(p.fta)::int as fta,
  sum(p.oreb)::int as oreb, sum(p.dreb)::int as dreb, sum(p.reb)::int as reb,
  sum(p.ast)::int as ast, sum(p.stl)::int as stl, sum(p.blk)::int as blk,
  sum(p.tov)::int as tov, sum(p.pf)::int as pf, sum(p.fd)::int as fd,
  sum(p.plus_minus)::int as plus_minus, sum(p.eff)::int as eff,
  max(p.pts)::int as best_pts
from public.fiba_player_games p
join public.fiba_games g on g.id = p.game_id
where p.seconds > 0
group by p.player_id, g.category;

revoke all on public.fiba_team_aliases, public.fiba_team_games, public.fiba_player_games, public.fiba_player_season from anon, authenticated;

-- "23:45" → 1425 sekundi
create or replace function public.fiba_seconds(m text)
returns integer
language sql immutable parallel safe
as $$ select case when m ~ '^\d+:\d{1,2}$' then split_part(m, ':', 1)::int * 60 + split_part(m, ':', 2)::int else 0 end $$;

-- Box score jedne utakmice iz data.json (zamjenjuje stari upis)
create or replace function public.fiba_store_box_score(game bigint, d jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  s int;
  t jsonb;
  pl jsonb;
  periods smallint[];
  i int;
begin
  delete from public.fiba_player_games where game_id = game;
  delete from public.fiba_team_games where game_id = game;
  for s in 1 .. 2 loop
    t := d -> 'tm' -> s::text;
    if t is null then continue; end if;
    periods := '{}';
    i := 1;
    while t ? ('p' || i || '_score') loop
      periods := periods || coalesce((t ->> ('p' || i || '_score'))::smallint, 0::smallint);
      i := i + 1;
    end loop;
    insert into public.fiba_team_games (
      game_id, side, team_name, club_key, coach, score, periods,
      pts, fgm, fga, tpm, tpa, ftm, fta, oreb, dreb, reb, ast, stl, blk, tov, pf, eff,
      paint, fast_break, second_chance, from_turnovers, bench, biggest_lead, biggest_run, lead_changes, times_tied
    ) values (
      game, s, t ->> 'name', public.fiba_club_key(t ->> 'name'), nullif(t ->> 'coach', ''), coalesce((t ->> 'score')::smallint, 0), periods,
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
end $$;

-- Feed aktivnih takmičenja → fiba_games (isto kao storeFeed u aplikaciji, i kad niko ne otvara stranicu)
create or replace function public.sync_fiba_feed()
returns integer
language plpgsql security definer set search_path = public, extensions
as $$
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
        coalesce(c.category, public.fiba_youth_category(r ->> 'homename', r ->> 'awayname')),
        (r ->> 'matchTimeUTC')::timestamp at time zone 'UTC',
        r ->> 'matchStatus', (r ->> 'live') = '1',
        r ->> 'homename', r ->> 'awayname', nullif(r ->> 'homelogo', ''), nullif(r ->> 'awaylogo', ''),
        case when r ->> 'matchStatus' in ('SCHEDULED', 'READY') then null else nullif(r ->> 'homescore', '')::smallint end,
        case when r ->> 'matchStatus' in ('SCHEDULED', 'READY') then null else nullif(r ->> 'awayscore', '')::smallint end,
        now()
      from jsonb_array_elements(res.content::jsonb) r
      where r ->> 'matchTimeUTC' is not null
      on conflict (id) do update set
        starts_at = excluded.starts_at, status = excluded.status, live = excluded.live,
        home_name = excluded.home_name, away_name = excluded.away_name,
        home_logo = excluded.home_logo, away_logo = excluded.away_logo,
        home_score = excluded.home_score, away_score = excluded.away_score,
        -- Kategorija omladinske lige se ne dira kad je već postavljena (uvoz)
        category = coalesce(fiba_games.category, excluded.category),
        -- Utakmica ispravljena poslije završetka (novi rezultat) dobija novi box score
        stats_at = case when (fiba_games.home_score, fiba_games.away_score) is distinct from (excluded.home_score, excluded.away_score) then null else fiba_games.stats_at end,
        updated_at = now();
      n := n + 1;
    exception when others then
      raise warning 'FIBA feed %: %', c.id, sqlerrm;
    end;
  end loop;
  return n;
end $$;

-- Završene utakmice bez box scorea → data.json (FIBA zatvori utakmicu sa "game end"; nezatvorena starija od 4 h je gotova)
create or replace function public.sync_fiba_stats(max_games integer default 15)
returns integer
language plpgsql security definer set search_path = public, extensions
as $$
declare
  g record;
  res extensions.http_response;
  d jsonb;
  n int := 0;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '8000');
  for g in
    select id, starts_at from public.fiba_games
     where stats_at is null
       and (status in ('COMPLETE', 'FINISHED', 'CONFIRMED') or starts_at < now() - interval '4 hours')
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
      perform public.fiba_store_box_score(g.id, d);
      update public.fiba_games set stats_at = now() where id = g.id;
      n := n + 1;
    exception when others then
      raise warning 'FIBA box score %: %', g.id, sqlerrm;
    end;
  end loop;
  return n;
end $$;

revoke all on function public.fiba_store_box_score(bigint, jsonb), public.sync_fiba_feed(), public.sync_fiba_stats(integer) from public, anon, authenticated;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'sync-fiba-stats';
end $$;

-- Svake 2 minute: feed, pa box score završenih
select cron.schedule('sync-fiba-stats', '*/2 * * * *', $job$ select public.sync_fiba_feed(); select public.sync_fiba_stats(15) $job$);

-- Klubovi FIBA ekipa (src/lib/fiba-clubs.ts)
insert into public.fiba_team_aliases (team_key, club_key) values
  ($$akademija realway$$, $$2bc39e25-4b29-49e9-a2b2-255f068b5ef0$$),
  ($$realway$$, $$2bc39e25-4b29-49e9-a2b2-255f068b5ef0$$),
  ($$kk realway u14$$, $$2bc39e25-4b29-49e9-a2b2-255f068b5ef0$$),
  ($$kk realway u16$$, $$2bc39e25-4b29-49e9-a2b2-255f068b5ef0$$),
  ($$realway 1 u18$$, $$2bc39e25-4b29-49e9-a2b2-255f068b5ef0$$),
  ($$realway u14$$, $$2bc39e25-4b29-49e9-a2b2-255f068b5ef0$$),
  ($$realway u16$$, $$2bc39e25-4b29-49e9-a2b2-255f068b5ef0$$),
  ($$realway u18$$, $$2bc39e25-4b29-49e9-a2b2-255f068b5ef0$$),
  ($$realway wu13$$, $$2bc39e25-4b29-49e9-a2b2-255f068b5ef0$$),
  ($$realway wu14$$, $$2bc39e25-4b29-49e9-a2b2-255f068b5ef0$$),
  ($$realway wu16$$, $$2bc39e25-4b29-49e9-a2b2-255f068b5ef0$$),
  ($$bosna u18$$, $$6fa91446-f915-42ee-b2f3-e4974e07ee06$$),
  ($$bosnjak$$, $$1804b244-b0d8-4294-9a74-b0a53731e4c0$$),
  ($$ceba u18$$, $$2026-10-20/fiba/ceba.png$$),
  ($$celik$$, $$484c9753-58c1-4760-b30a-f886b4838b74$$),
  ($$celik bh telecom$$, $$5b0dd343-4ccd-58eb-bb19-4320462a859f$$),
  ($$drina betin$$, $$f46b36a0-b494-43f4-81d0-fe0e50047c9c$$),
  ($$gen u18$$, $$7191cfa2-1708-44eb-9a2b-e2772e50fff2$$),
  ($$gradina s$$, $$d36288c2-1806-4cfc-bade-44a507f3214d$$),
  ($$gradina tesanj$$, $$d00fe371-fc65-4f0c-90dd-28c316203988$$),
  ($$hkk siroki tt kabeli$$, $$7f67e716-381a-46de-888e-75b28a2dd6b3$$),
  ($$siroki brijeg u18$$, $$7f67e716-381a-46de-888e-75b28a2dd6b3$$),
  ($$hkk zrinjski 1992$$, $$dbb32c49-5b19-481c-b7fc-af6794200174$$),
  ($$igman ist. ilidza u14$$, $$0a5c2806-2f83-4cf6-9919-f3aa56c80f9b$$),
  ($$igman ist. ilidza u16$$, $$0a5c2806-2f83-4cf6-9919-f3aa56c80f9b$$),
  ($$igman ist. ilidza wu14$$, $$0a5c2806-2f83-4cf6-9919-f3aa56c80f9b$$),
  ($$ilidza black u14$$, $$370294d2-5ab0-4ac7-9ebb-fc1637027a82$$),
  ($$ilidza u16$$, $$370294d2-5ab0-4ac7-9ebb-fc1637027a82$$),
  ($$ilidza u18$$, $$370294d2-5ab0-4ac7-9ebb-fc1637027a82$$),
  ($$igman burch$$, $$3e399948-dfc5-4859-8db9-8fa67fbf6bc0$$),
  ($$igman burch u16$$, $$3e399948-dfc5-4859-8db9-8fa67fbf6bc0$$),
  ($$igman burch u18$$, $$3e399948-dfc5-4859-8db9-8fa67fbf6bc0$$),
  ($$kk igman burch u16$$, $$3e399948-dfc5-4859-8db9-8fa67fbf6bc0$$),
  ($$igman richmond park u16$$, $$3e399948-dfc5-4859-8db9-8fa67fbf6bc0$$),
  ($$igman richmond park u18$$, $$3e399948-dfc5-4859-8db9-8fa67fbf6bc0$$),
  ($$jedinstvo$$, $$9a72cefc-e594-409d-b842-4bbdf79b117d$$),
  ($$kk "travnik" travnik$$, $$e3ad5938-48bd-4f27-90c4-118dc1187ed6$$),
  ($$kk travnik$$, $$e3ad5938-48bd-4f27-90c4-118dc1187ed6$$),
  ($$kk "zivinice" zivinice$$, $$08bb19a3-70c3-42cf-a484-722f94d12a5c$$),
  ($$zivinice$$, $$08bb19a3-70c3-42cf-a484-722f94d12a5c$$),
  ($$kk basket zivinice$$, $$10633d35-d8f4-49dc-92b1-974ceaeb4651$$),
  ($$kk borac wwin$$, $$a245c5f2-dfc1-435f-8980-f3413e5d4bbb$$),
  ($$kk donji vakuf$$, $$983c1eb5-5f27-4602-b13a-a324bac8e53d$$),
  ($$kk donji vakuf promo$$, $$983c1eb5-5f27-4602-b13a-a324bac8e53d$$),
  ($$kk gradacac$$, $$2a188593-4168-4d30-b99a-f47eefe5454b$$),
  ($$kk jumper$$, $$b5f01bdb-33eb-4193-89ec-9593d541af5b$$),
  ($$kk kos u14$$, $$f546d0aa-0c12-410a-b6bd-2a28feff91c7$$),
  ($$kk kos u16$$, $$f546d0aa-0c12-410a-b6bd-2a28feff91c7$$),
  ($$kos u16$$, $$f546d0aa-0c12-410a-b6bd-2a28feff91c7$$),
  ($$kos u18$$, $$f546d0aa-0c12-410a-b6bd-2a28feff91c7$$),
  ($$kk lavovi$$, $$2026-10-20/fiba/lavovi.png$$),
  ($$kk leotar$$, $$047cc84d-c7d0-4611-bc27-e979154e02a7$$),
  ($$kk mladost$$, $$caaf3558-c0a5-4e5d-a216-8917e28fb42f$$),
  ($$kk orlovik$$, $$de0dd25e-3783-48d4-bae9-b235a51c6bfb$$),
  ($$kk radnicki$$, $$cd57b11f-479b-4245-be47-6fd38bab86ab$$),
  ($$kk startz$$, $$7692ba50-0cbf-4abc-8a3d-c44889e46a51$$),
  ($$kk turbina$$, $$dfa0d5ef-310d-4892-a9bc-01afacf30021$$),
  ($$turbina$$, $$dfa0d5ef-310d-4892-a9bc-01afacf30021$$),
  ($$kk vogosca$$, $$ecc3a2ef-41af-4da6-ab77-7fc32b59441c$$),
  ($$vogosca$$, $$ecc3a2ef-41af-4da6-ab77-7fc32b59441c$$),
  ($$vogosca u18$$, $$ecc3a2ef-41af-4da6-ab77-7fc32b59441c$$),
  ($$kakanj$$, $$65c0a81c-2856-4e77-b4db-d2666ad0bed5$$),
  ($$konjic$$, $$29a704d6-7465-4dd3-851a-be3b023de1b0$$),
  ($$lider$$, $$2026-10-20/fiba/lider.png$$),
  ($$leotar 03$$, $$2026-10-20/fiba/leotar-03.png$$),
  ($$marsonia u18$$, $$2026-10-20/fiba/marsonia.png$$),
  ($$mladost ilijas wu14$$, $$923b4c9f-85ec-473d-a927-a8fd541351a7$$),
  ($$mladost wu16$$, $$923b4c9f-85ec-473d-a927-a8fd541351a7$$),
  ($$mladi krajisnik$$, $$2026-10-20/fiba/mladi-krajisnik.png$$),
  ($$okk slavija 1996$$, $$f69a2ed5-41f8-4e7f-acab-3434a4ce09cc$$),
  ($$okk sloboda energoinvest$$, $$0676f2c4-143d-4341-9f3b-849f47119c09$$),
  ($$sloboda u16$$, $$0676f2c4-143d-4341-9f3b-849f47119c09$$),
  ($$okk spars u14$$, $$5d655778-973c-4589-849c-ab5eaf8f9ccd$$),
  ($$okk spars u16$$, $$5d655778-973c-4589-849c-ab5eaf8f9ccd$$),
  ($$spars u18$$, $$5d655778-973c-4589-849c-ab5eaf8f9ccd$$),
  ($$spars number 1 u16$$, $$5d655778-973c-4589-849c-ab5eaf8f9ccd$$),
  ($$bosna-spars u18$$, $$5d655778-973c-4589-849c-ab5eaf8f9ccd$$),
  ($$kk bosna spars$$, $$5d655778-973c-4589-849c-ab5eaf8f9ccd$$),
  ($$okk zenica$$, $$8c706bbf-520c-4d4a-bf5f-31c1111714b5$$),
  ($$orlovi$$, $$2026-10-20/fiba/orlovi.png$$),
  ($$play off wu14$$, $$25c7f34e-409e-4037-9e96-70468caa0eb7$$),
  ($$play off wu16$$, $$25c7f34e-409e-4037-9e96-70468caa0eb7$$),
  ($$play off$$, $$25c7f34e-409e-4037-9e96-70468caa0eb7$$),
  ($$rilski sportist u16$$, $$2026-10-20/fiba/rilski-sportist.png$$),
  ($$rmu banovici$$, $$2026-10-20/fiba/banovici.png$$),
  ($$ukk ius famos$$, $$dd7c7d07-09c7-4b47-a1be-e6b1a5e0b526$$),
  ($$zeljo 1971$$, $$a925551f-9a55-4e03-a55b-c6f59d55b945$$)
on conflict (team_key) do update set club_key = excluded.club_key;

-- Utakmice bez kategorije iz naziva ekipa
update public.fiba_games set category = public.fiba_youth_category(home_name, away_name) where category is null and public.fiba_youth_category(home_name, away_name) is not null;
