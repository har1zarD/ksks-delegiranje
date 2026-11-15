-- Odgođena utakmica lige saveza (A2 jug, A1 žene) koja se kasnije odigra (korisnik, 2026-11-15): link_fiba_ksbih je tražio
-- FIBA utakmicu samo ±1 dan od termina naše utakmice, a odgođena utakmica u aplikaciji i dalje nosi stari termin. Zato se
-- nikad nije povezala (ŽKK RMU Banovići – ŽKK Brčko Distrikt 104:17, odigrano 10. 11., kod nas i dalje "odgođeno"), pa je
-- nije bilo ni u rezultatima, ni u tabeli, ni u biltenu. Odgođena utakmica se sada povezuje sa ZAVRŠENOM FIBA utakmicom
-- istog para (isti domaćin) odigranom poslije prvobitnog termina; dobija stvarni termin, četvrtine i status "završena".
-- Uzvrat istog para ima obrnuto domaćinstvo, pa se ne može zamijeniti.
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
      select m.id as match_id, g.id as game_id, g.status, lg.category, m.status as match_status,
             g.starts_at as game_starts_at, g.home_score as game_home, g.away_score as game_away,
             count(*) over (partition by m.id) as per_match,
             count(*) over (partition by g.id) as per_game
        from public.matches m
        join leagues lg on lg.competition_id = m.competition_id
        join public.teams h on h.id = m.home_team_id
        join public.teams a on a.id = m.away_team_id
        join public.fiba_games g
          on g.competition_id = 50201
         and (
           g.starts_at between m.starts_at - interval '1 day' and m.starts_at + interval '1 day'
           or (m.status = 'postponed' and g.status = 'COMPLETE' and g.home_score is not null and g.away_score is not null
               and g.starts_at > m.starts_at and g.starts_at < m.starts_at + interval '150 days')
         )
         and public.fiba_team_word(g.home_name) = public.fiba_team_word(h.name)
         and public.fiba_team_word(g.away_name) = public.fiba_team_word(a.name)
         -- Muška A1 liga je u istom FIBA takmičenju: "Konjic", "Brcko Distrikt" i "Celik" nisu ženske ekipe
         and not (lg.category = 'a1_z' and (g.home_name in ('Konjic', 'Brcko Distrikt', 'KK  Brcko', 'Celik') or g.away_name in ('Konjic', 'Brcko Distrikt', 'KK  Brcko', 'Celik')))
       where m.fiba_game_id is null
         and m.status <> 'cancelled'
         and not exists (select 1 from public.matches x where x.fiba_game_id = g.id)
    )
    select * from cand where per_match = 1 and per_game = 1
  loop
    begin
      update public.matches set fiba_game_id = l.game_id where id = l.match_id and fiba_game_id is null;
      update public.fiba_games set category = l.category where id = l.game_id;
      if l.match_status = 'postponed' and l.status = 'COMPLETE' and l.game_home is not null and l.game_away is not null then
        -- Odigrana odgođena utakmica: stvarni termin, četvrtine, pa završena; bez četvrtina ostaje konačan rezultat iz feeda
        update public.matches set starts_at = l.game_starts_at where id = l.match_id;
        perform public.fiba_pull_periods(l.match_id, l.game_id);
        update public.matches set status = 'finished' where id = l.match_id;
        update public.matches set home_score = l.game_home, away_score = l.game_away
         where id = l.match_id and (home_score is null or away_score is null);
      elsif l.status not in ('SCHEDULED', 'READY') then
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

-- Odmah, za već odigrane odgođene utakmice
select public.link_fiba_ksbih();
