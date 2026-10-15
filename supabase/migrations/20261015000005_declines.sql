-- Trajna evidencija odbijenih nominacija za statistiku.
-- Odbijena nominacija se briše iz assignments čim se delegira zamjena (jedinstvenost pozicije na utakmici),
-- pa se svako odbijanje ovdje zapiše okidačem u trenutku kad status postane 'declined'.
create table public.assignment_declines (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  position    public.assignment_position not null,
  reason      text,
  declined_at timestamptz not null default now()
);
create index assignment_declines_profile on public.assignment_declines (profile_id, declined_at);

-- Samo servisni klijent (admin statistika); bez politika nema pristupa kroz API
alter table public.assignment_declines enable row level security;

create or replace function public.log_assignment_decline()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.assignment_declines (match_id, profile_id, position, reason, declined_at)
  values (new.match_id, new.profile_id, new.position, new.decline_reason, coalesce(new.responded_at, now()));
  return new;
end $$;

create trigger assignment_declined
  after update of status on public.assignments
  for each row
  when (new.status = 'declined' and old.status is distinct from 'declined')
  execute function public.log_assignment_decline();

-- Postojeća odbijanja koja još stoje u assignments
insert into public.assignment_declines (match_id, profile_id, position, reason, declined_at)
select match_id, profile_id, position, decline_reason, coalesce(responded_at, created_at)
  from public.assignments
 where status = 'declined';
