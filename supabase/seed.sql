-- Seed: Omladinska liga KS 2026/27 (izvor: Takmičarska komisija KSKS, dokument 'Omladinska LIGA KS 2026-2027 NOVO.doc')
-- Idempotentno: može se pokretati više puta.
begin;

insert into public.halls (name, city) values ('SD Hadžići', 'Hadžići') on conflict (name) do nothing;
insert into public.seasons (name, starts_on, ends_on, is_current) values ('2026/27','2026-09-01','2027-06-30',true) on conflict (name) do nothing;

insert into public.clubs (name, short_name, city) values ('KK MVP', 'MVP', null) on conflict (name) do nothing;
insert into public.clubs (name, short_name, city) values ('KK Realway', 'Realway', null) on conflict (name) do nothing;
insert into public.clubs (name, short_name, city) values ('KK Koš', 'Koš', null) on conflict (name) do nothing;
insert into public.clubs (name, short_name, city) values ('KK Ilidža', 'Ilidža', 'Ilidža') on conflict (name) do nothing;
insert into public.clubs (name, short_name, city) values ('KK Spars', 'Spars', null) on conflict (name) do nothing;
insert into public.clubs (name, short_name, city) values ('KK Feniks', 'Feniks', null) on conflict (name) do nothing;
insert into public.clubs (name, short_name, city) values ('KK Bošnjak', 'Bošnjak', 'Hadžići') on conflict (name) do nothing;
insert into public.clubs (name, short_name, city) values ('KK Igman', 'Igman', 'Ilidža') on conflict (name) do nothing;
insert into public.clubs (name, short_name, city) values ('KK GEN', 'GEN', null) on conflict (name) do nothing;
insert into public.clubs (name, short_name, city) values ('KK Hrasnica', 'Hrasnica', 'Ilidža') on conflict (name) do nothing;
insert into public.clubs (name, short_name, city) values ('KK Mladost', 'Mladost', null) on conflict (name) do nothing;
insert into public.clubs (name, short_name, city) values ('KK Huskies', 'Huskies', null) on conflict (name) do nothing;
insert into public.clubs (name, short_name, city) values ('KK BBY', 'BBY', null) on conflict (name) do nothing;
insert into public.clubs (name, short_name, city) values ('KK Point', 'Point', null) on conflict (name) do nothing;

insert into public.competitions (season_id, name, short_name, category, gender, starts_on, format, fee_km, sort)
  select id, 'Pioniri — Grupa 1', 'Pioniri G1', 'pioniri', 'M', '2026-10-24', 'Dvokružni bod sistem, 22 kola. Nakon 11 kola tri prvoplasirane ekipe ulaze u ligu Sistema A.', '800', 1 from public.seasons where name = '2026/27'
  on conflict (season_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK MVP', 1 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 1' and k.short_name = 'MVP'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Realway', 2 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 1' and k.short_name = 'Realway'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Koš', 3 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 1' and k.short_name = 'Koš'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Ilidža Orange', 4 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 1' and k.short_name = 'Ilidža'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Spars', 5 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 1' and k.short_name = 'Spars'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Feniks', 6 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 1' and k.short_name = 'Feniks'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Bošnjak', 7 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 1' and k.short_name = 'Bošnjak'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Igman', 8 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 1' and k.short_name = 'Igman'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK GEN', 9 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 1' and k.short_name = 'GEN'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Hrasnica', 10 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 1' and k.short_name = 'Hrasnica'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Mladost', 11 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 1' and k.short_name = 'Mladost'
  on conflict (competition_id, name) do nothing;

insert into public.competitions (season_id, name, short_name, category, gender, starts_on, format, fee_km, sort)
  select id, 'Pioniri — Grupa 2', 'Pioniri G2', 'pioniri', 'M', '2026-10-31', 'Jednokružni bod sistem, turnirski (svaka ekipa organizuje jedno kolo). Četiri prvoplasirane igraju play-off.', '200', 2 from public.seasons where name = '2026/27'
  on conflict (season_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Realway B', 1 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 2' and k.short_name = 'Realway'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Realway C', 2 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 2' and k.short_name = 'Realway'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK MVP B', 3 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 2' and k.short_name = 'MVP'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Koš B', 4 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 2' and k.short_name = 'Koš'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Ilidža Blue', 5 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 2' and k.short_name = 'Ilidža'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Akademija Realway', 6 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 2' and k.short_name = 'Realway'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Huskies', 7 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 2' and k.short_name = 'Huskies'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Spars B', 8 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 2' and k.short_name = 'Spars'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Spars Akademija', 9 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 2' and k.short_name = 'Spars'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK BBY', 10 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Pioniri — Grupa 2' and k.short_name = 'BBY'
  on conflict (competition_id, name) do nothing;

insert into public.competitions (season_id, name, short_name, category, gender, starts_on, format, fee_km, sort)
  select id, 'Kadeti — Grupa 1', 'Kadeti G1', 'kadeti', 'M', '2026-10-31', 'Dvokružni bod sistem, 14 kola, zatim Liga 4 za prvaka (1–4) i liga za plasman (5–8) uz prenos bodova. Nakon 7 kola tri prvoplasirane ulaze u ligu Sistema A.', '800', 3 from public.seasons where name = '2026/27'
  on conflict (season_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Igman Richmond Park', 1 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 1' and k.short_name = 'Igman'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK MVP', 2 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 1' and k.short_name = 'MVP'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Realway', 3 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 1' and k.short_name = 'Realway'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Koš', 4 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 1' and k.short_name = 'Koš'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Ilidža Orange', 5 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 1' and k.short_name = 'Ilidža'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Spars', 6 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 1' and k.short_name = 'Spars'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Feniks', 7 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 1' and k.short_name = 'Feniks'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Igman', 8 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 1' and k.short_name = 'Igman'
  on conflict (competition_id, name) do nothing;

insert into public.competitions (season_id, name, short_name, category, gender, starts_on, format, fee_km, sort)
  select id, 'Kadeti — Grupa 2', 'Kadeti G2', 'kadeti', 'M', '2026-11-07', 'Jednokružni bod sistem, 9 kola, turnirski. Četiri prvoplasirane igraju play-off.', '200', 4 from public.seasons where name = '2026/27'
  on conflict (season_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK MVP B', 1 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 2' and k.short_name = 'MVP'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK BBY 3x3', 2 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 2' and k.short_name = 'BBY'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Realway B', 3 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 2' and k.short_name = 'Realway'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Koš B', 4 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 2' and k.short_name = 'Koš'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Point', 5 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 2' and k.short_name = 'Point'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK GEN', 6 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 2' and k.short_name = 'GEN'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Hrasnica', 7 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 2' and k.short_name = 'Hrasnica'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Mladost', 8 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 2' and k.short_name = 'Mladost'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Ilidža Black', 9 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 2' and k.short_name = 'Ilidža'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK BBY', 10 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Kadeti — Grupa 2' and k.short_name = 'BBY'
  on conflict (competition_id, name) do nothing;

insert into public.competitions (season_id, name, short_name, category, gender, starts_on, format, fee_km, sort)
  select id, 'Juniori', 'Juniori', 'juniori', 'M', '2026-10-31', 'Dvokružni bod sistem, 18 kola. Nakon 9 kola tri prvoplasirane ulaze u ligu Sistema A.', '800', 5 from public.seasons where name = '2026/27'
  on conflict (season_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Feniks', 1 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Juniori' and k.short_name = 'Feniks'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Igman Richmond Park', 2 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Juniori' and k.short_name = 'Igman'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Realway', 3 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Juniori' and k.short_name = 'Realway'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Koš', 4 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Juniori' and k.short_name = 'Koš'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Point', 5 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Juniori' and k.short_name = 'Point'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK GEN', 6 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Juniori' and k.short_name = 'GEN'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Ilidža IUS', 7 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Juniori' and k.short_name = 'Ilidža'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK BBY 3x3', 8 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Juniori' and k.short_name = 'BBY'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Spars', 9 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Juniori' and k.short_name = 'Spars'
  on conflict (competition_id, name) do nothing;

insert into public.competitions (season_id, name, short_name, category, gender, starts_on, format, fee_km, sort)
  select id, 'Minibasket', 'Minibasket', 'minibasket', 'M', '2026-11-07', 'Dvokružni bod sistem, 22 kola.', null, 6 from public.seasons where name = '2026/27'
  on conflict (season_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Ilidža', 1 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Minibasket' and k.short_name = 'Ilidža'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK BBY', 2 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Minibasket' and k.short_name = 'BBY'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK BBY Jahorina', 3 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Minibasket' and k.short_name = 'BBY'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Mladost', 4 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Minibasket' and k.short_name = 'Mladost'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Koš', 5 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Minibasket' and k.short_name = 'Koš'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Realway', 6 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Minibasket' and k.short_name = 'Realway'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Realway B', 7 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Minibasket' and k.short_name = 'Realway'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Igman', 8 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Minibasket' and k.short_name = 'Igman'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK MVP', 9 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Minibasket' and k.short_name = 'MVP'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Spars', 10 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Minibasket' and k.short_name = 'Spars'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Spars B', 11 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Minibasket' and k.short_name = 'Spars'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Feniks', 12 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Minibasket' and k.short_name = 'Feniks'
  on conflict (competition_id, name) do nothing;

insert into public.competitions (season_id, name, short_name, category, gender, starts_on, format, fee_km, sort)
  select id, 'Unobasket', 'Unobasket', 'unobasket', 'M', '2026-11-14', 'Dvokružni bod sistem.', null, 7 from public.seasons where name = '2026/27'
  on conflict (season_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Ilidža', 1 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Unobasket' and k.short_name = 'Ilidža'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK BBY Blue', 2 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Unobasket' and k.short_name = 'BBY'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Mladost', 3 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Unobasket' and k.short_name = 'Mladost'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Realway', 4 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Unobasket' and k.short_name = 'Realway'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Igman', 5 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Unobasket' and k.short_name = 'Igman'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK MVP', 6 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Unobasket' and k.short_name = 'MVP'
  on conflict (competition_id, name) do nothing;
insert into public.teams (competition_id, club_id, name, sort)
  select c.id, k.id, 'KK Bošnjak', 7 from public.competitions c join public.seasons s on s.id = c.season_id, public.clubs k
  where s.name = '2026/27' and c.name = 'Unobasket' and k.short_name = 'Bošnjak'
  on conflict (competition_id, name) do nothing;

update public.clubs set hall_id = (select id from public.halls where name = 'SD Hadžići') where short_name = 'Bošnjak' and hall_id is null;

update public.competitions set fee_due_on = '2026-10-19', fee_first_km = 500 where name = 'Pioniri — Grupa 1' and fee_due_on is null;
update public.competitions set fee_due_on = '2026-10-26', fee_first_km = 500 where name = 'Kadeti — Grupa 1' and fee_due_on is null;
update public.competitions set fee_due_on = '2026-10-26', fee_first_km = 500 where name = 'Juniori' and fee_due_on is null;
update public.competitions set fee_due_on = '2026-10-26', fee_first_km = null where name = 'Pioniri — Grupa 2' and fee_due_on is null;
update public.competitions set fee_due_on = '2026-10-26', fee_first_km = null where name = 'Kadeti — Grupa 2' and fee_due_on is null;
commit;
