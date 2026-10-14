-- Vrsta utakmice i isplata naknada po angažmanu.
--  * Liga (podrazumijevano) ulazi u tabelu; prijateljska, turnir i ostalo (vlastiti naziv) ne ulaze, ali se delegiraju i plaćaju.
--  * Savez označava isplatu za svako delegiranje (sudija, sto, komesar); osoba vidi status svojih utakmica.

create type public.match_kind as enum ('league', 'friendly', 'tournament', 'custom');

alter table public.matches
  add column kind public.match_kind not null default 'league',
  add column kind_label text,
  -- Vlastiti naziv samo za "ostalo" i tamo je obavezan
  add constraint matches_kind_label check ((kind = 'custom') = (kind_label is not null and length(trim(kind_label)) > 0));

alter table public.assignments
  add column paid_at timestamptz,
  add column paid_by uuid references public.profiles (id) on delete set null;

create index assignments_unpaid on public.assignments (profile_id) where paid_at is null and status = 'accepted';
