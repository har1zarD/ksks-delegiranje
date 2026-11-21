-- Ispravka rezultata (korisnik, 21.11.2026.): savez može ispraviti četvrtine i FIBA utakmice. Ispravljene četvrtine
-- nose updated_by (sync ga ne postavlja), pa ih sync_fiba_periods više ne prepisuje u svom prozoru od 6 sati.
-- Ponovno povezivanje FIBA utakmice (fiba_pull_periods) i dalje namjerno prepisuje sve.
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
       -- Četvrtine koje je ispravio savez (updated_by postavljen) FIBA više ne prepisuje
       and not exists (select 1 from public.match_periods mp where mp.match_id = matches.id and mp.updated_by is not null)
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
