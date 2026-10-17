-- Automatsko zaključavanje utakmica (korisnik, 2026-10-17): dan nakon što se odigra, utakmica sama postaje
-- završena (ulazi u obračun naknada) i kad je niko ne zaključi ručno. Posao živi u bazi (pg_cron), svaki sat;
-- aplikacija keš drži najviše minutu, pa se promjena vidi bez posebne invalidacije.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Ponovljivo: stari posao istog imena se ukloni pa doda (cron.schedule starijih verzija ne mijenja postojeći)
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'finish-played-matches';
end $$;

select cron.schedule(
  'finish-played-matches',
  '7 * * * *',
  $job$
    update public.matches
    set status = 'finished'
    where status in ('scheduled', 'live')
      -- dan utakmice (po Sarajevu) je prošao
      and (starts_at at time zone 'Europe/Sarajevo')::date < (now() at time zone 'Europe/Sarajevo')::date
      -- i sigurno je gotova (kasni termin, produžeci)
      and starts_at < now() - interval '3 hours'
  $job$
);
