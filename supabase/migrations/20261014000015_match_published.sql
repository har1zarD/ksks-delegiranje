-- Objava nominacije: dok admin ne aktivira utakmicu, delegiranje je radna verzija (sudije je ne vide).
-- Aktiviranje upisuje published_at na utakmicu i notified_at na delegiranja (vidljivost za službena lica).
alter table public.matches add column published_at timestamptz;
update public.matches m set published_at = s.first_sent
  from (select match_id, min(notified_at) as first_sent from public.assignments where notified_at is not null group by match_id) s
 where s.match_id = m.id;
