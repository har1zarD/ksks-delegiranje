-- FIBA statistika rjeđe (korisnik, 2026-11-20): sync-fiba-stats svakih 10 min umjesto 2 (krug traje ~0,5 s, do 1,7 s).
-- Rezultat uživo i dalje svake minute (sync-fiba-periods, ~20 ms).
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'sync-fiba-stats';
end $$;

select cron.schedule(
  'sync-fiba-stats', '*/10 * * * *',
  $job$ select public.sync_fiba_feed(); select public.link_fiba_ksbih(); select public.link_fiba_youth(); select public.sync_fiba_stats(15) $job$
);
