-- Raspored klubovima: kad je utakmica (datum, vrijeme, dvorana, ekipe; bez službenih lica) poslana klubovima mailom.
alter table public.matches add column clubs_notified_at timestamptz;
