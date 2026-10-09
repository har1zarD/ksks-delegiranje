-- Učvršćivanje (nalaz pregleda koda):
--  * podatke čitaju samo korisnici s aktivnim profilom (a ne bilo ko s Auth sesijom)
--  * komesar unosi rezultat samo dok je utakmica uživo; status samo scheduled → live → finished
--  * na nominaciju se odgovara tek kad je poslana (notified_at)

-- Prijavljen korisnik s aktivnim profilom
create or replace function public.is_member()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and active) $$;

-- Deaktiviran admin više nije admin
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active) $$;

do $$
declare t text;
begin
  foreach t in array array['seasons','competitions','halls','clubs','teams','fee_rates','matches','match_periods','profiles']
  loop
    execute format('alter policy "%1$s_read" on public.%1$s using (public.is_member())', t);
  end loop;
end $$;

-- Rezultat: komesar samo dok je utakmica uživo (admin preko match_periods_admin uvijek)
create or replace function public.can_score(m uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_match_commissioner(m)
     and exists (select 1 from public.matches where id = m and status = 'live')
$$;

alter policy "match_periods_commissioner" on public.match_periods
  using (public.can_score(match_id))
  with check (public.can_score(match_id));

-- Status: komesar samo scheduled → live → finished; admin bilo koji prelaz
create or replace function public.set_match_status(m uuid, s public.match_status)
returns public.matches
language plpgsql security definer set search_path = public
as $$
declare
  cur public.match_status;
  r public.matches;
begin
  select status into cur from public.matches where id = m;
  if cur is null then raise exception 'Utakmica nije pronađena'; end if;

  if not public.is_admin() then
    if not public.is_match_commissioner(m) then
      raise exception 'Nemaš pravo mijenjati status ove utakmice';
    end if;
    if not ((cur = 'scheduled' and s = 'live') or (cur = 'live' and s = 'finished')) then
      raise exception 'Komesar može samo započeti zakazanu ili završiti utakmicu u toku';
    end if;
  end if;

  update public.matches set status = s where id = m returning * into r;
  return r;
end $$;

-- Odgovor na nominaciju: samo vlastita, poslana, pending ili accepted
create or replace function public.respond_to_assignment(a uuid, accept boolean, reason text default null)
returns public.assignments
language plpgsql security definer set search_path = public
as $$
declare r public.assignments;
begin
  update public.assignments
     set status = case when accept then 'accepted'::assignment_status else 'declined'::assignment_status end,
         decline_reason = case when accept then null else reason end,
         responded_at = now()
   where id = a and profile_id = auth.uid() and notified_at is not null and status in ('pending', 'accepted')
  returning * into r;
  if r.id is null then raise exception 'Nominacija nije pronađena'; end if;
  return r;
end $$;
