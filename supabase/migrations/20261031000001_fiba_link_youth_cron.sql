-- Automatsko povezivanje omladinske lige, svako jutro (korisnik, 2026-10-31): link_fiba_youth je dosad bio
-- samo na klik "Sinhronizuj" (vidi 20261030000006_fiba_link_youth.sql — "korisnik hoće ovo samo na klik");
-- korisnik sad hoće da se omladinska liga sama poveže i sinhronizuje s utakmicama bez pritiska dugmeta.
-- Ide u pg_cron u 8:30 po Sarajevu (kad FIBA obično već ima raspored/kodove za taj dan). pg_cron na ovoj bazi
-- radi po UTC (cron.timezone = GMT); mijenjati to globalno bi uticalo na sve poslove u bazi, pa se umjesto toga
-- posao zakaže na oba moguća UTC termina (6:30 i 7:30 — Sarajevo je uvijek UTC+1 ili UTC+2, pun sat, pa je
-- minuta ista) i unutra provjeri da je trenutni sarajevski sat baš 8; onaj drugi termin (hour=7 ili hour=9)
-- se sam preskoči. Tako je tačno 8:30 lokalno cijele godine, bez ručnog diranja DST-a.
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'link-fiba-youth';
end $$;

select cron.schedule(
  'link-fiba-youth',
  '30 6,7 * * *',
  $job$
    do $body$
    begin
      if extract(hour from now() at time zone 'Europe/Sarajevo')::int = 8 then
        perform public.sync_fiba_feed();
        perform public.link_fiba_youth();
      end if;
    end
    $body$;
  $job$
);
