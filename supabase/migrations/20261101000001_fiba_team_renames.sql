-- Naziv FIBA ekipe kako ga prikazujemo (korisnik, 2026-11-01): u juniorima FIBA LiveStats piše samo "BOSNA U18",
-- a ekipa je Bosna Spars. Sinhronizacija svaki put prepiše naziv iz feeda, pa preimenovanje radi trigger na
-- upisu (fiba_games, fiba_team_games, fiba_player_games). Isto radi FIBA_TEAM_RENAMES u src/lib/fiba.ts za live prikaz.

create table public.fiba_team_renames (
  team_key text primary key, -- fiba_key(naziv u FIBA feedu)
  name     text not null     -- naziv kod nas
);
alter table public.fiba_team_renames enable row level security;

insert into public.fiba_team_renames (team_key, name) values ('bosna u18', 'BOSNA SPARS U18')
on conflict (team_key) do update set name = excluded.name;

-- Novi naziv mora ostati u istom klubu (isti ID igrača, isti logo)
insert into public.fiba_team_aliases (team_key, club_key)
select public.fiba_key(r.name), a.club_key
  from public.fiba_team_renames r
  join public.fiba_team_aliases a on a.team_key = r.team_key
on conflict (team_key) do nothing;

create or replace function public.fiba_team_rename(team text)
returns text
language sql stable parallel safe
as $$ select coalesce((select name from public.fiba_team_renames where team_key = public.fiba_key(team)), team) $$;

create or replace function public.fiba_games_rename()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.home_name := public.fiba_team_rename(new.home_name);
  new.away_name := public.fiba_team_rename(new.away_name);
  return new;
end
$$;

create or replace function public.fiba_team_name_rename()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.team_name := public.fiba_team_rename(new.team_name);
  return new;
end
$$;

create or replace trigger fiba_games_rename before insert or update of home_name, away_name on public.fiba_games
  for each row execute function public.fiba_games_rename();
create or replace trigger fiba_team_games_rename before insert or update of team_name on public.fiba_team_games
  for each row execute function public.fiba_team_name_rename();
create or replace trigger fiba_player_games_rename before insert or update of team_name on public.fiba_player_games
  for each row execute function public.fiba_team_name_rename();

-- Postojeći redovi
update public.fiba_games set home_name = public.fiba_team_rename(home_name)
 where public.fiba_key(home_name) in (select team_key from public.fiba_team_renames);
update public.fiba_games set away_name = public.fiba_team_rename(away_name)
 where public.fiba_key(away_name) in (select team_key from public.fiba_team_renames);
update public.fiba_team_games set team_name = public.fiba_team_rename(team_name)
 where public.fiba_key(team_name) in (select team_key from public.fiba_team_renames);
update public.fiba_player_games set team_name = public.fiba_team_rename(team_name)
 where public.fiba_key(team_name) in (select team_key from public.fiba_team_renames);
