-- FIBA igrač ↔ licenca u svim kategorijama (ne samo A2 jug i A1 žene): igrač se traži među licencama svog kluba u
-- tekućoj sezoni, u bilo kojem takmičenju (npr. igrač Sparsa u Premijer ligi ima licencu u juniorima). Klub FIBA ekipe:
-- naše ekipe tekuće sezone s istom riječju kluba (fiba_team_word) i klubovi kojima ta riječ stoji u nazivu
-- ("SPARS U18" → KK Bosna Spars). Ista osoba s više licenci (A2 i juniori) je jedan igrač; bira se licenca lige
-- utakmice, pa ona s fotografijom.

create or replace function public.fiba_license_for(category text, team text, first text, family text)
returns uuid
language sql stable security definer set search_path = public, extensions
as $$
  with w as (select public.fiba_team_word(team) as word),
  pool as (
    select t.club_id
      from public.teams t
      join public.competitions c on c.id = t.competition_id
      join public.seasons s on s.id = c.season_id and s.is_current, w
     where public.fiba_team_word(t.name) = w.word
    union
    select c.id
      from public.clubs c, w
     where length(w.word) >= 3
       and w.word = any (regexp_split_to_array(public.fiba_key(c.name || ' ' || coalesce(c.short_name, '')), '[[:space:]-]+'))
  ),
  fiba as (
    select public.fiba_key(coalesce(first, '') || ' ' || coalesce(family, '')) as full,
           public.fiba_key(first) as f, public.fiba_key(family) as fam
  ),
  cand as (
    select l.id,
           public.fiba_key(l.first_name || ' ' || l.last_name) as who,
           l.photo_path is not null as photo,
           l.competition_id = case category
             when 'a2' then 'd74bc0b4-99f1-4313-8c15-463f76d06764'::uuid
             when 'a1_z' then '443667aa-44cf-4c3c-9934-5b3d426c8de4'::uuid
           end as own,
           least(
             levenshtein(fiba.full, public.fiba_key(l.first_name || ' ' || l.last_name)),
             levenshtein(fiba.full, public.fiba_key(l.last_name || ' ' || l.first_name)),
             case when fiba.f = public.fiba_key(l.first_name) and fiba.fam like public.fiba_key(l.last_name) || '_%' then 1 end
           ) as d,
           length(public.fiba_key(l.first_name || ' ' || l.last_name)) as len,
           -- Ime i prezime svako za sebe blizu (ili obrnutim redom): ime do trećine slova razlike ili samo inicijal,
           -- prezime do četvrtine slova razlike ili spojeno s viškom ("Čengićmirza")
           (     (levenshtein(fiba.f, public.fiba_key(l.first_name)) <= greatest(1, length(public.fiba_key(l.first_name)) / 3)
                  or (length(replace(fiba.f, '.', '')) <= 2 and left(fiba.f, 1) = left(public.fiba_key(l.first_name), 1)))
             and (levenshtein(fiba.fam, public.fiba_key(l.last_name)) <= greatest(1, length(public.fiba_key(l.last_name)) / 4)
                  or fiba.fam like public.fiba_key(l.last_name) || '_%')
           ) or (
                 levenshtein(fiba.fam, public.fiba_key(l.first_name)) <= greatest(1, length(public.fiba_key(l.first_name)) / 3)
             and levenshtein(fiba.f, public.fiba_key(l.last_name)) <= greatest(1, length(public.fiba_key(l.last_name)) / 4)
           ) as close
      from public.licenses l
      join public.competitions c on c.id = l.competition_id
      join public.seasons s on s.id = c.season_id and s.is_current, fiba
     where l.kind = 'player' and l.club_id in (select club_id from pool)
  ),
  best as (select min(d) as d from cand)
  select c.id
    from cand c, best b
   where c.d = b.d and c.d <= greatest(2, c.len / 4) and c.close
     -- Jedna osoba na najmanjoj udaljenosti (ista osoba može imati više licenci)
     and (select count(distinct x.who) from cand x where x.d = b.d) = 1
   order by c.own desc nulls last, c.photo desc, c.id
   limit 1
$$;

/** Veže FIBA igrače svih kategorija za licencu (samo još nevezane; `only_game` = jedna utakmica, inače zadnje 3 sedmice) */
create or replace function public.fiba_link_licenses(only_game bigint default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  lic record;
  pid text;
  n int := 0;
begin
  for r in
    select p.game_id, p.side, p.player_id, p.team_name, p.first_name, p.family_name, g.category
      from public.fiba_player_games p
      join public.fiba_games g on g.id = p.game_id
     where p.license_id is null
       -- Bez `only_game` (cron) samo utakmice zadnje tri sedmice: puni prolaz traje oko minute
       and (p.game_id = only_game or (only_game is null and g.starts_at > now() - interval '21 days'))
  loop
    select l.id, l.first_name, l.last_name into lic
      from public.licenses l where l.id = public.fiba_license_for(r.category, r.team_name, r.first_name, r.family_name);
    if lic.id is null then continue; end if;
    pid := public.fiba_license_player_id(lic.id);
    update public.fiba_player_games
       set license_id = lic.id,
           first_name = lic.first_name,
           family_name = lic.last_name,
           player_id = case
             when exists (select 1 from public.fiba_player_games x where x.game_id = r.game_id and x.side = r.side and x.player_id = pid) then player_id
             else pid end
     where game_id = r.game_id and side = r.side and player_id = r.player_id;
    n := n + 1;
  end loop;
  perform public.fiba_league_names(only_game);
  return n;
end $$;

-- Jednokratno sve utakmice (cron dalje radi samo zadnje tri sedmice)
do $$
declare g bigint;
begin
  for g in select distinct p.game_id from public.fiba_player_games p where p.license_id is null loop
    perform public.fiba_link_licenses(g);
  end loop;
end $$;
