-- KK Pale nije na zvaničnom spisku saveza za Minibasket 2026/27 (traženo uklanjanje, 02.11.2026).
-- Jedina veza: prijateljska utakmica MVP : Pale (29.10.2026, odigrana i objavljena) u Minibasket takmičenju.
-- Obriši utakmicu prvo (matches.*_team_id nema on delete cascade); brisanje kluba kaskadno briše njegov jedini tim
-- (teams.club_id on delete cascade) — klub nema ni licence ni druge timove.
delete from public.matches where id = '86a01f49-a4d1-4e2f-b0f4-ebae0f2c1c0e';
delete from public.clubs where id = '64b833ea-0e21-4247-b730-c88d4960c4fe';
