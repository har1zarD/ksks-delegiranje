-- Klubovi iz tabela saveza 2025/26 koji nisu bili u bazi; Ženska liga; Čelik i u A2 ligi jug
insert into public.clubs (name, short_name)
select 'KK ' || v.short, v.short
  from (values ('Impuls'), ('Libertas'), ('BDF Patriots'), ('StarTz'), ('G-Stars'), ('Bugojno')) as v(short)
 where not exists (select 1 from public.clubs c where c.short_name = v.short);

insert into public.teams (competition_id, club_id, name, sort)
select comp.id, club.id, v.team, v.sort
  from (values
    ('Ženska liga', 'StarTz', 'StarTz', 1),
    ('Ženska liga', 'G-Stars', 'G-Stars', 2),
    ('Ženska liga', 'Bugojno', 'Bugojno', 3),
    ('Ženska liga', 'Čelik', 'Čelik', 4),
    ('Ženska liga', 'Play Off', 'Play Off', 5),
    ('A2 liga jug KSBiH', 'Čelik', 'Čelik', 11)
  ) as v(comp, club, team, sort)
  join public.competitions comp on comp.name = v.comp
  join public.seasons s on s.id = comp.season_id and s.is_current
  join public.clubs club on club.short_name = v.club
 where not exists (select 1 from public.teams t where t.competition_id = comp.id and t.name = v.team);
