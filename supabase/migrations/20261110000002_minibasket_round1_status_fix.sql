-- Minibasket, 1. kolo (15.11.2026): 6 utakmica pogrešno označeno status='finished' bez rezultata,
-- pa ih getSocialSchedules() (status in scheduled/postponed) nikad nije vraćao — "1. kolo" se nije
-- ni pojavljivalo u Kolo dropdownu na /admin/objave. Vraćeno na 'scheduled'.
update public.matches
   set status = 'scheduled'
 where competition_id = 'ecd30198-7ae7-4856-a411-d7bb0c7e35d3'
   and round = 1
   and status = 'finished'
   and home_score is null
   and away_score is null;
