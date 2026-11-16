-- Utakmice iz rasporeda saveza za Unobasket (PDF "UNO BASKET", 16.11.2026): 42 utakmice, 14 kola, dvokružno, 7 ekipa;
-- "Slobodna ekipa" se preskače. Parovi i datumi kola iz src/lib/unobasket-raspored.ts.
-- Vrijeme 18:00, dvorana nije određena (admin ih mijenja po satnici kola), broj dodjeljuje baza (trigger),
-- sastav ekipe po pravilima takmičenja kao u createFixtureMatch. Već napravljen par se preskače.
insert into public.matches (
  competition_id, round, home_team_id, away_team_id, starts_at,
  has_referees, referee_count, has_commissioner, has_scorer, has_assistant_scorer, has_timer,
  has_assistant_timer, has_shot_clock, has_timer_shot_clock, stats_count, digital_scoresheet, table_count
)
select c.id, f.round, h.id, a.id, (f.day::date + time '18:00') at time zone 'Europe/Sarajevo',
  c.referees_default, case when c.referee_count_default = 3 then 3 else 2 end, c.commissioner_default, c.scorer_default,
  c.assistant_scorer_default, c.timer_default, c.assistant_timer_default, c.shot_clock_default, c.timer_shot_clock_default,
  c.stats_default, c.digital_default, case when c.shot_clock_default then 3 else 2 end
from (values
  (1, 1, 'KK Ilidža', 'KK Igman', '2026-11-21'),
  (2, 1, 'KK BBY Blue', 'KK MVP', '2026-11-21'),
  (3, 1, 'KK Mladost', 'KK Realway', '2026-11-21'),
  (4, 2, 'KK MVP', 'KK Mladost', '2026-12-05'),
  (5, 2, 'KK Igman', 'KK BBY Blue', '2026-12-05'),
  (6, 2, 'KK Bošnjak', 'KK Ilidža', '2026-12-05'),
  (7, 3, 'KK BBY Blue', 'KK Bošnjak', '2026-12-12'),
  (8, 3, 'KK Mladost', 'KK Igman', '2026-12-12'),
  (9, 3, 'KK Realway', 'KK MVP', '2026-12-12'),
  (10, 4, 'KK Igman', 'KK Realway', '2026-12-19'),
  (11, 4, 'KK Bošnjak', 'KK Mladost', '2026-12-19'),
  (12, 4, 'KK Ilidža', 'KK BBY Blue', '2026-12-19'),
  (13, 5, 'KK Mladost', 'KK Ilidža', '2027-01-30'),
  (14, 5, 'KK Realway', 'KK Bošnjak', '2027-01-30'),
  (15, 5, 'KK MVP', 'KK Igman', '2027-01-30'),
  (16, 6, 'KK Bošnjak', 'KK MVP', '2027-02-06'),
  (17, 6, 'KK Ilidža', 'KK Realway', '2027-02-06'),
  (18, 6, 'KK BBY Blue', 'KK Mladost', '2027-02-06'),
  (19, 7, 'KK Realway', 'KK BBY Blue', '2027-02-20'),
  (20, 7, 'KK MVP', 'KK Ilidža', '2027-02-20'),
  (21, 7, 'KK Igman', 'KK Bošnjak', '2027-02-20'),
  (22, 8, 'KK Igman', 'KK Ilidža', '2027-03-06'),
  (23, 8, 'KK MVP', 'KK BBY Blue', '2027-03-06'),
  (24, 8, 'KK Realway', 'KK Mladost', '2027-03-06'),
  (25, 9, 'KK Mladost', 'KK MVP', '2027-03-20'),
  (26, 9, 'KK BBY Blue', 'KK Igman', '2027-03-20'),
  (27, 9, 'KK Ilidža', 'KK Bošnjak', '2027-03-20'),
  (28, 10, 'KK Bošnjak', 'KK BBY Blue', '2027-04-03'),
  (29, 10, 'KK Igman', 'KK Mladost', '2027-04-03'),
  (30, 10, 'KK MVP', 'KK Realway', '2027-04-03'),
  (31, 11, 'KK Realway', 'KK Igman', '2027-04-17'),
  (32, 11, 'KK Mladost', 'KK Bošnjak', '2027-04-17'),
  (33, 11, 'KK BBY Blue', 'KK Ilidža', '2027-04-17'),
  (34, 12, 'KK Ilidža', 'KK Mladost', '2027-04-24'),
  (35, 12, 'KK Bošnjak', 'KK Realway', '2027-04-24'),
  (36, 12, 'KK Igman', 'KK MVP', '2027-04-24'),
  (37, 13, 'KK MVP', 'KK Bošnjak', '2027-05-08'),
  (38, 13, 'KK Realway', 'KK Ilidža', '2027-05-08'),
  (39, 13, 'KK Mladost', 'KK BBY Blue', '2027-05-08'),
  (40, 14, 'KK BBY Blue', 'KK Realway', '2027-05-22'),
  (41, 14, 'KK Ilidža', 'KK MVP', '2027-05-22'),
  (42, 14, 'KK Bošnjak', 'KK Igman', '2027-05-22')
) as f (n, round, home, away, day)
join public.competitions c on c.id = 'c6b366f8-1d26-4b9d-94fe-bfefd988ca60'
join public.teams h on h.competition_id = c.id and h.name = f.home
join public.teams a on a.competition_id = c.id and a.name = f.away
where not exists (
  select 1 from public.matches m where m.competition_id = c.id and m.home_team_id = h.id and m.away_team_id = a.id
)
order by f.n;
