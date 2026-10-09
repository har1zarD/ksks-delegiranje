-- Omladinska liga: za zapisničkim stolom uvijek 2 osobe (zapisničar + mjerač vremena, bez 24 sekunde).
alter table public.competitions alter column table_count_default set default 2;
alter table public.matches alter column table_count set default 2;

update public.competitions set table_count_default = 2 where table_count_default <> 2;
update public.matches set table_count = 2 where table_count <> 2 and status in ('scheduled', 'postponed');

-- Pozicija "24 sekunde" više ne postoji na tim utakmicama: delegiranje se otkazuje (ne briše)
update public.assignments a
   set status = 'cancelled'
  from public.matches m
 where a.match_id = m.id and m.table_count = 2 and a.position = 'shot_clock' and a.status <> 'cancelled';
