-- A1 liga žene KSBiH na FIBA LiveStats (korisnik, 2026-10-25): kao A2 jug, KSBiH vodi i A1 žene u FIBA takmičenju 50201
-- bez podatka o ligi. Povezivanje (link_fiba_a2) postaje opšte za obje lige: naša utakmica dobija FIBA utakmicu istog
-- dana (±1 dan) i istih klubova, a FIBA utakmica kategoriju lige (a2, a1_z) za svoj spisak i statistiku.
create or replace function public.link_fiba_ksbih()
returns integer
language plpgsql security definer set search_path = public, extensions
as $$
declare
  l record;
  n int := 0;
begin
  for l in
    with leagues (competition_id, category) as (
      values ('d74bc0b4-99f1-4313-8c15-463f76d06764'::uuid, 'a2'),   -- A2 liga jug KSBiH
             ('443667aa-44cf-4c3c-9934-5b3d426c8de4'::uuid, 'a1_z')  -- A1 liga žene KSBiH
    ),
    cand as (
      select m.id as match_id, g.id as game_id, g.status, lg.category,
             count(*) over (partition by m.id) as per_match,
             count(*) over (partition by g.id) as per_game
        from public.matches m
        join leagues lg on lg.competition_id = m.competition_id
        join public.teams h on h.id = m.home_team_id
        join public.teams a on a.id = m.away_team_id
        join public.fiba_games g
          on g.competition_id = 50201
         and g.starts_at between m.starts_at - interval '1 day' and m.starts_at + interval '1 day'
         and public.fiba_team_word(g.home_name) = public.fiba_team_word(h.name)
         and public.fiba_team_word(g.away_name) = public.fiba_team_word(a.name)
       where m.fiba_game_id is null
         and not exists (select 1 from public.matches x where x.fiba_game_id = g.id)
    )
    select match_id, game_id, status, category from cand where per_match = 1 and per_game = 1
  loop
    begin
      update public.matches set fiba_game_id = l.game_id where id = l.match_id and fiba_game_id is null;
      update public.fiba_games set category = l.category where id = l.game_id;
      if l.status not in ('SCHEDULED', 'READY') then
        perform public.fiba_pull_periods(l.match_id, l.game_id);
        -- Već odigrana: odmah završena (dalje sync_fiba_periods)
        if l.status in ('COMPLETE', 'FINISHED', 'CONFIRMED') then
          update public.matches set status = 'finished' where id = l.match_id and status in ('scheduled', 'live');
        end if;
      end if;
      n := n + 1;
    exception when others then
      raise warning 'FIBA KSBiH veza % (FIBA %): %', l.match_id, l.game_id, sqlerrm;
    end;
  end loop;
  return n;
end $$;

revoke all on function public.link_fiba_ksbih() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'sync-fiba-stats';
end $$;

select cron.schedule('sync-fiba-stats', '*/2 * * * *', $job$ select public.sync_fiba_feed(); select public.link_fiba_ksbih(); select public.sync_fiba_stats(15) $job$);

drop function public.link_fiba_a2();

-- Odmah: već odigrane A1 utakmice žena
select public.link_fiba_ksbih();
