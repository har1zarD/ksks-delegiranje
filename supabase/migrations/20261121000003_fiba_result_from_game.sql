-- FIBA rezultat iz same utakmice (korisnik, 21.11.2026.): feed takmičenja (competition/<id>.json) kasni i satima drži
-- odigrane utakmice kao SCHEDULED bez koševa, a utakmicu koja ispadne iz feeda nikad ne zatvori (npr. Lokomotiva – Star
-- Fojnica, A2 jug 5. kolo). Takve utakmice (bez naše utakmice u aplikaciji) zato nisu ulazile u tabelu i rezultate.
-- Sada: sync_fiba_stats čita data.json utakmice već 90 min poslije početka; kad FIBA zabilježi kraj ("game end"),
-- upiše COMPLETE i konačni rezultat. Feed više ne vraća završenu utakmicu na SCHEDULED.

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
        starts_at = excluded.starts_at,
        home_name = excluded.home_name, away_name = excluded.away_name,
        home_logo = excluded.home_logo, away_logo = excluded.away_logo,
        -- Zakašnjeli feed (SCHEDULED/READY) ne briše rezultat koji je sync_fiba_stats već upisao iz utakmice
        status = case when fiba_games.status = 'COMPLETE' and excluded.status in ('SCHEDULED', 'READY') then fiba_games.status else excluded.status end,
        live = case when fiba_games.status = 'COMPLETE' and excluded.status in ('SCHEDULED', 'READY') then false else excluded.live end,
        home_score = case when fiba_games.status = 'COMPLETE' and excluded.status in ('SCHEDULED', 'READY') then fiba_games.home_score else excluded.home_score end,
        away_score = case when fiba_games.status = 'COMPLETE' and excluded.status in ('SCHEDULED', 'READY') then fiba_games.away_score else excluded.away_score end,
        -- Kategorija omladinske lige se ne dira kad je već postavljena (uvoz)
        category = coalesce(fiba_games.category, excluded.category),
        -- Utakmica ispravljena poslije završetka (novi rezultat) dobija novi box score
        stats_at = case
          when fiba_games.status = 'COMPLETE' and excluded.status in ('SCHEDULED', 'READY') then fiba_games.stats_at
          when (fiba_games.home_score, fiba_games.away_score) is distinct from (excluded.home_score, excluded.away_score) then null
          else fiba_games.stats_at end,
        updated_at = now();
      n := n + 1;
    exception when others then
      raise warning 'FIBA feed %: %', c.id, sqlerrm;
    end;
  end loop;
  return n;
end $$;

-- Završene utakmice bez box scorea → data.json. Utakmica se gleda od 90 min poslije početka; sa "game end" je gotova
-- (box score, COMPLETE i konačni rezultat). Nezatvorena starija od 4 h je i dalje gotova (stari uslov).
create or replace function public.sync_fiba_stats(max_games integer default 15)
returns integer
language plpgsql security definer set search_path = public, extensions
as $$
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
  return n;
end $$;

revoke all on function public.sync_fiba_feed(), public.sync_fiba_stats(integer) from public, anon, authenticated;

-- Odmah: utakmice koje su već dobile box score, a feed ih drži bez rezultata (zadnjih 30 dana)
update public.fiba_games g set
  status = 'COMPLETE', live = false,
  home_score = h.score, away_score = a.score
from public.fiba_team_games h, public.fiba_team_games a
where h.game_id = g.id and h.side = 1 and a.game_id = g.id and a.side = 2
  and g.stats_at is not null and g.starts_at > now() - interval '30 days'
  and g.status in ('SCHEDULED', 'READY') and g.home_score is null
  and h.score + a.score > 0;

select public.sync_fiba_stats(30);

-- Do 30 utakmica po krugu (subota: omladinske lige + seniori; utakmice koje još traju se gledaju svaki krug)
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'sync-fiba-stats';
end $$;

select cron.schedule(
  'sync-fiba-stats', '*/10 * * * *',
  $job$ select public.sync_fiba_feed(); select public.link_fiba_ksbih(); select public.link_fiba_youth(); select public.sync_fiba_stats(30) $job$
);
