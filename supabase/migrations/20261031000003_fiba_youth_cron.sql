-- Automatsko povezivanje omladinske lige u cron (korisnik, 2026-10-31): link_fiba_youth je bio samo na klik
-- ("Sinhronizuj" na /fiba) dok se logika nije provjerila na pravim utakmicama; sad (poslije ispravke fiba_team_word
-- i link_fiba_youth bez kategorije) ide i u pg_cron, kao link_fiba_ksbih za A2/A1Ž.

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'sync-fiba-stats';
end $$;

select cron.schedule(
  'sync-fiba-stats', '*/2 * * * *',
  $job$ select public.sync_fiba_feed(); select public.link_fiba_ksbih(); select public.link_fiba_youth(); select public.sync_fiba_stats(15) $job$
);
