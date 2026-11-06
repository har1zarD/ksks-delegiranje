-- A1 liga žene, 2. kolo (korisnik, 06.11.2026): FIBA LiveStats je pala tokom dvije utakmice, pa je upisan rezultat
-- nepotpun/netačan. Admin je dao stvarni konačni rezultat; četvrtine se brišu (nepouzdane, nepotpune) i upisuje se
-- samo ukupan rezultat. ŽKK StarTz je odustao od lige — jedina im je utakmica (1. kolo, neodigrana) i uklanjaju se
-- iz takmičenja; nema kotizacija niti licenci vezanih na ovaj tim (provjereno), tako da je brisanje bezbjedno.

-- Žkk Play Off : ŽKK Čelik, stala na 33:44 (1. i 2. četvrtina), stvarni rezultat 64:75
delete from public.match_periods where match_id = 'fb9f4ccb-e08f-419b-b941-4a6ae6475eff';
update public.matches set home_score = 64, away_score = 75 where id = 'fb9f4ccb-e08f-419b-b941-4a6ae6475eff';

-- ŽKK G-Stars : ŽKK Zenica, statistika nije upisala ništa, stvarni rezultat 66:51
update public.matches set home_score = 66, away_score = 51 where id = '2edb8835-a330-413f-984b-f43f17679ddb';

-- ŽKK StarTz odustao: obriši njihovu (jedinu, neodigranu) utakmicu i tim u A1 ligi žene
delete from public.matches where id = '717aa1ad-6c76-4ea0-af91-471ee8ce354f';
delete from public.teams where id = 'a885c484-6a5b-4d47-bd43-5c4d0dfc5afa';
