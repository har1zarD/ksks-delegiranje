-- Ko je skinut s već poslane nominacije (uklonjen ili zamijenjen drugom osobom).
-- Red delegiranja se pri tome briše (pozicija i osoba su jedinstveni po utakmici), pa je ovo trajni trag:
-- objava izmjena šalje izmijenjenu nominaciju i skinutima od zadnje objave (ime precrtano), uz ekipu utakmice.
-- Odbijanja su već u assignment_declines.
create table public.assignment_removals (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  position    public.assignment_position not null,
  reason      text not null check (reason in ('removed', 'replaced')),
  removed_at  timestamptz not null default now()
);
create index assignment_removals_match on public.assignment_removals (match_id, removed_at);

alter table public.assignment_removals enable row level security;
-- Piše servisni klijent; admin smije čitati
create policy "assignment_removals_admin" on public.assignment_removals for select to authenticated using (public.is_admin());
