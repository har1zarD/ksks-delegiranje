-- Omladinska liga: jedna osoba radi glavno vrijeme i 24/14 → nova pozicija timer_shot_clock (jedno delegiranje).
-- Podrazumijevani sastavi za stolom:
--  * Juniori, Pioniri — Grupa 1, Kadeti — Grupa 1: 1 statistika + glavno vrijeme–24/14
--  * Pioniri — Grupa 2, Kadeti — Grupa 2, Minibasket, Unobasket: zapisnik + glavno vrijeme–24/14
-- Postojeće utakmice zadržavaju svoj sastav (mijenja se na utakmici); novo važi za nove utakmice.
alter type public.assignment_position add value if not exists 'timer_shot_clock' after 'shot_clock';

alter table public.matches add column has_timer_shot_clock boolean not null default false;
alter table public.competitions add column timer_shot_clock_default boolean not null default false;

update public.competitions
   set scorer_default = false, assistant_scorer_default = false, timer_default = false, shot_clock_default = false,
       timer_shot_clock_default = true, stats_default = 1
 where name = 'Juniori' or name like 'Pioniri%Grupa 1' or name like 'Kadeti%Grupa 1';

update public.competitions
   set scorer_default = true, assistant_scorer_default = false, timer_default = false, shot_clock_default = false,
       timer_shot_clock_default = true, stats_default = 0
 where name in ('Minibasket', 'Unobasket') or name like 'Pioniri%Grupa 2' or name like 'Kadeti%Grupa 2';
