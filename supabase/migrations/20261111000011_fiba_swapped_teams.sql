-- FIBA utakmica s obrnutim domaćinom i gostom (korisnik, 11.11.2026.): Pioniri G1, utakmica 10 je kod nas
-- KK Realway – KK Koš (po rasporedu), a u FIBA Organizeru je upisana kao KK Koš U14 – REALWAY U14. link_fiba_youth
-- je tražio isti redoslijed pa je nije povezao; povezana ručno bi dobila koševe na pogrešnoj strani.
-- matches.fiba_swapped = FIBA domaćin je naš gost; sinhronizacija četvrtina tada mijenja strane.

alter table public.matches add column if not exists fiba_swapped boolean not null default false;

-- FIBA utakmica ima domaćina i gosta obrnuto od naše (po prvoj riječi naziva ekipe, kao u povezivanju)
create or replace function public.fiba_is_swapped(match uuid, game bigint)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $function$
  select coalesce((
    select public.fiba_team_word(g.home_name) = public.fiba_team_word(a.name)
       and public.fiba_team_word(g.away_name) = public.fiba_team_word(h.name)
       -- dvije ekipe istog kluba (Realway Plavi – Realway Bijeli) daju istu riječ: tada se ne zna, ostaje isti redoslijed
       and public.fiba_team_word(h.name) <> public.fiba_team_word(a.name)
      from public.matches m
      join public.teams h on h.id = m.home_team_id
      join public.teams a on a.id = m.away_team_id
      join public.fiba_games g on g.id = game
     where m.id = match
  ), false)
$function$;

revoke all on function public.fiba_is_swapped(uuid, bigint) from public, anon, authenticated;

-- Četvrtine iz FIBA LiveStats: kod obrnute utakmice FIBA ekipa 1 (domaćin) je naš gost
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
  h int;
  a int;
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
  loop
    begin
      res := extensions.http_get('https://fibalivestats.dcd.shared.geniussports.com/data/' || m.fiba_game_id || '/data.json');
      if res.status <> 200 then continue; end if;
      d := res.content::jsonb;
      -- Utakmica još nije počela u LiveStats (nema akcija)
      if coalesce(jsonb_array_length(d -> 'pbp'), 0) = 0 then continue; end if;
      cur := least(coalesce((d ->> 'period')::int, 0), 12);
      for p in 1 .. cur loop
        h := (d -> 'tm' -> (case when m.fiba_swapped then '2' else '1' end) ->> ('p' || p || '_score'))::int;
        a := (d -> 'tm' -> (case when m.fiba_swapped then '1' else '2' end) ->> ('p' || p || '_score'))::int;
        if h is null or a is null then continue; end if;
        insert into public.match_periods (match_id, period, home_points, away_points, updated_at)
        values (m.id, p, h, a, now())
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
  h int;
  a int;
  swapped boolean;
begin
  select m.fiba_swapped into swapped from public.matches m where m.id = match;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '8000');
  res := extensions.http_get('https://fibalivestats.dcd.shared.geniussports.com/data/' || game || '/data.json');
  if res.status <> 200 then return false; end if;
  d := res.content::jsonb;
  if coalesce(jsonb_array_length(d -> 'pbp'), 0) = 0 then return false; end if;
  cur := least(coalesce((d ->> 'period')::int, 0), 12);
  for p in 1 .. cur loop
    h := (d -> 'tm' -> (case when swapped then '2' else '1' end) ->> ('p' || p || '_score'))::int;
    a := (d -> 'tm' -> (case when swapped then '1' else '2' end) ->> ('p' || p || '_score'))::int;
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
end $function$;

revoke all on function public.fiba_pull_periods(uuid, bigint) from public, anon, authenticated;

-- Omladinsko povezivanje: par se prepoznaje i kad su domaćin i gost u FIBA-i obrnuti (isti redoslijed ima prednost)
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
