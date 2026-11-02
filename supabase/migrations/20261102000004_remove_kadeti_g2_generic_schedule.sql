-- Prije nego su izmjene stranice takmičenja stigle na produkciju, generičko dugme "Napravi raspored"
-- (Bergerova tabela) je napravilo 90 utakmica za Kadeti — Grupa 2 (18 kola × 5, dvokružno), koje se ne
-- poklapaju sa stvarnim rasporedom saveza (PDF "KADETI GRUPA 2", 11 kola, jednokružno). Nijedna odigrana.
delete from public.matches where competition_id = 'efa174a7-1a9a-464c-ad1d-5c8ba0aee67b' and status = 'scheduled';
