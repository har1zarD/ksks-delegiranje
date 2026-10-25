-- Omladinska liga KS 2026/27 na FIBA LiveStats je novo takmičenje (50399); 47625 je prošla sezona.
-- Na produkciji upisano direktno 25. 10. 2026.
insert into public.fiba_competitions (id, name, sort, active) values (50399, 'Omladinska liga KS 2026/27', 0, true)
on conflict (id) do nothing;
