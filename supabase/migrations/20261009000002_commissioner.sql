-- Komesar: status utakmice (uživo / završena) i zaključavanje biltena nakon slanja.

-- Komesar (prihvaćeno delegiranje) ili admin mijenja status utakmice.
-- Komesar smije samo scheduled → live → finished; admin bilo koji prelaz ide kroz update na matches.
create or replace function public.set_match_status(m uuid, s public.match_status)
returns public.matches
language plpgsql security definer set search_path = public
as $$
declare r public.matches;
begin
  if not (public.is_admin() or public.is_match_commissioner(m)) then
    raise exception 'Nemaš pravo mijenjati status ove utakmice';
  end if;
  if not public.is_admin() and s not in ('live', 'finished') then
    raise exception 'Komesar može samo započeti ili završiti utakmicu';
  end if;
  update public.matches set status = s where id = m returning * into r;
  if r.id is null then raise exception 'Utakmica nije pronađena'; end if;
  return r;
end $$;

-- Bilten: komesar piše dok ga ne pošalje (submitted_at); nakon slanja mijenja samo admin.
-- (alter umjesto drop: politika "for all" — insert/update/delete samo dok je nacrt; čitanje pokriva reports_read)
alter policy "reports_commissioner" on public.match_reports
  using (public.is_match_commissioner(match_id) and submitted_at is null)
  with check (public.is_match_commissioner(match_id) and commissioner = auth.uid());
