-- Ispravka public.fiba_team_word (korisnik, 2026-10-31): "kos" je bio na listi tipova kluba za skidanje prefiksa
-- (kk/okk/ukk/kzk/zkk/kos), ali to je ime stvarnog kluba (KK Koš) — FIBA ga ponekad piše bez "KK" ispred ("KOŠ U16"),
-- pa je regex brisao cijelo "kos " i ostajalo samo "u16"/"u18", bez ičega od identiteta kluba. Zato se KK Koš nikad
-- nije sam povezao (link_fiba_a2 / link_fiba_ksbih / link_fiba_youth) kad FIBA ne piše "KK" ispred. Provjereno: nijedan
-- naš ni FIBA naziv ne koristi "kos" kao stvaran prefiks tipa kluba (samo kao skraćenicu imena kluba Koš).

create or replace function public.fiba_team_word(t text)
returns text
language sql immutable parallel safe
as $$ select split_part(regexp_replace(public.fiba_key(t), '^(kk|okk|ukk|kzk|zkk)\s+', ''), ' ', 1) $$;
