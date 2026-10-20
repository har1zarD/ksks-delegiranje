-- Rezultat s FIBA LiveStats (korisnik, 2026-10-20): utakmica povezana s FIBA utakmicom (matches.fiba_game_id) ne traži
-- unos rezultata od komesara; četvrtine se svake minute prepisuju iz FIBA LiveStats u match_periods (okidač
-- sync_match_score računa ukupni rezultat, Realtime osvježava stranice). Posao živi u bazi (pg_cron + http).
create extension if not exists http with schema extensions;

create or replace function public.sync_fiba_periods()
returns integer
language plpgsql security definer set search_path = public, extensions
as $$
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
    select id, fiba_game_id, status from public.matches
     where fiba_game_id is not null
       and status in ('scheduled', 'live', 'finished')
       and starts_at between now() - interval '6 hours' and now() + interval '30 minutes'
  loop
    begin
      res := extensions.http_get('https://fibalivestats.dcd.shared.geniussports.com/data/' || m.fiba_game_id || '/data.json');
      if res.status <> 200 then continue; end if;
      d := res.content::jsonb;
      -- Utakmica još nije počela u LiveStats (nema akcija)
      if coalesce(jsonb_array_length(d -> 'pbp'), 0) = 0 then continue; end if;
      cur := least(coalesce((d ->> 'period')::int, 0), 12);
      for p in 1 .. cur loop
        h := (d -> 'tm' -> '1' ->> ('p' || p || '_score'))::int;
        a := (d -> 'tm' -> '2' ->> ('p' || p || '_score'))::int;
        if h is null or a is null then continue; end if;
        insert into public.match_periods (match_id, period, home_points, away_points, updated_at)
        values (m.id, p, h, a, now())
        on conflict (match_id, period) do update
          set home_points = excluded.home_points, away_points = excluded.away_points, updated_at = now()
          where (match_periods.home_points, match_periods.away_points) is distinct from (excluded.home_points, excluded.away_points);
      end loop;
      if m.status = 'scheduled' then
        update public.matches set status = 'live' where id = m.id;
      end if;
      n := n + 1;
    exception when others then
      raise warning 'FIBA sync % (FIBA %): %', m.id, m.fiba_game_id, sqlerrm;
    end;
  end loop;
  return n;
end $$;

revoke all on function public.sync_fiba_periods() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'sync-fiba-periods';
end $$;

select cron.schedule('sync-fiba-periods', '* * * * *', $job$ select public.sync_fiba_periods() $job$);
