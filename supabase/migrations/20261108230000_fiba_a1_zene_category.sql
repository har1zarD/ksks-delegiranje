-- A1 liga žene dijeli isti FIBA competition_id (50201) s muškom A1 ligom, pa feed sve njene utakmice
-- označava kategorijom "a1" (fiba_competitions.category za taj id). sync_fiba_feed čuva već postavljenu
-- kategoriju (coalesce), pa kad god povežemo našu utakmicu A1 žene s FIBA utakmicom, odmah ispravimo
-- kategoriju na "a1_z" da se više ne pomiješa s muškom ligom (bilten i statistika ne zavise od ovoga,
-- ali /fiba stranica grupiše utakmice po kategoriji).
create or replace function public.fix_fiba_category_a1_zene()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.fiba_game_id is not null and new.competition_id = '443667aa-44cf-4c3c-9934-5b3d426c8de4' then
    update public.fiba_games set category = 'a1_z' where id = new.fiba_game_id and category is distinct from 'a1_z';
  end if;
  return new;
end $$;

drop trigger if exists fix_fiba_category_a1_zene on public.matches;
create trigger fix_fiba_category_a1_zene
  after insert or update of fiba_game_id on public.matches
  for each row execute function public.fix_fiba_category_a1_zene();

-- Utakmice već povezane prije ovog triggera
update public.fiba_games set category = 'a1_z'
where id in (select fiba_game_id from public.matches where competition_id = '443667aa-44cf-4c3c-9934-5b3d426c8de4' and fiba_game_id is not null);
