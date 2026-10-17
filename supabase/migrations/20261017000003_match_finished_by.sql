-- Ko je zaključio utakmicu (korisnik, 2026-10-17): savez, službeno lice s utakmice ili automatski (cron),
-- za uvid na detalju utakmice. Isplatu već pamti assignments.paid_by / paid_at.
alter table public.matches
  add column if not exists finished_at timestamptz,
  add column if not exists finished_by uuid references public.profiles (id) on delete set null;

-- Pečat pri prelasku u 'finished': vrijeme i ko. Akcija iz aplikacije proslijedi finished_by (servisni klijent nema
-- auth.uid()); RPC i admin forma idu kao prijavljeni korisnik (auth.uid()); cron/servis bez korisnika = null = automatski.
-- Ispravka rezultata već završene utakmice ne mijenja pečat; povratak iz 'finished' ga briše.
create or replace function public.stamp_match_finished()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'finished' then
    if old.status = 'finished' then
      new.finished_at := old.finished_at;
      new.finished_by := old.finished_by;
    else
      new.finished_at := now();
      new.finished_by := coalesce(new.finished_by, auth.uid());
    end if;
  else
    new.finished_at := null;
    new.finished_by := null;
  end if;
  return new;
end $$;

create or replace trigger matches_finished_stamp
  before update on public.matches
  for each row execute function public.stamp_match_finished();
