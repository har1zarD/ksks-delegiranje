-- Broj utakmice ("Utakmica 66"): jedan niz kroz cijelu sezonu, za sva takmičenja.
-- Bez upisanog broja okidač dodijeli sljedeći slobodan u sezoni; upisan broj ne smije se ponoviti u sezoni.

alter table public.matches add column number integer check (number > 0);

-- Postojeće utakmice: redom po vremenu početka, unutar sezone
update public.matches m
   set number = n.rn
  from (
    select mt.id, row_number() over (partition by c.season_id order by mt.starts_at, mt.created_at) as rn
      from public.matches mt
      join public.competitions c on c.id = mt.competition_id
  ) n
 where n.id = m.id;

alter table public.matches alter column number set not null;

create or replace function public.assign_match_number()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  season uuid;
begin
  if tg_op = 'UPDATE' and new.number is not distinct from old.number and new.competition_id = old.competition_id then
    return new;
  end if;

  select season_id into season from public.competitions where id = new.competition_id;
  -- Jedan po jedan unos po sezoni (dva admina ili generator rasporeda ne dobiju isti broj)
  perform pg_advisory_xact_lock(hashtext('match_number:' || season::text));

  if new.number is null then
    select coalesce(max(m.number), 0) + 1 into new.number
      from public.matches m
      join public.competitions c on c.id = m.competition_id
     where c.season_id = season;
  elsif exists (
    select 1 from public.matches m
      join public.competitions c on c.id = m.competition_id
     where c.season_id = season and m.number = new.number and m.id <> new.id
  ) then
    raise exception 'Broj utakmice % već postoji u ovoj sezoni', new.number using errcode = 'unique_violation';
  end if;
  return new;
end $$;

create trigger matches_number
before insert or update of number, competition_id on public.matches
for each row execute function public.assign_match_number();

create index matches_number on public.matches (number);
