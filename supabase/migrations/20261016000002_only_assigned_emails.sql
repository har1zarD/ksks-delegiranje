-- Lična postavka (Postavke → Obavještenja): nominacija kola poslana "svima sa liste" ne ide osobi koja nije delegirana
-- ni na jednu utakmicu u toj nominaciji. Emailovi o vlastitim delegiranjima (izmjene, otkazivanje, podsjetnik) idu i dalje.
-- Mijenja je samo vlasnik, preko servera (profiles nema update politiku za korisnike).
alter table public.profiles add column only_assigned_emails boolean not null default false;
