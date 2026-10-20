-- Pripremni turnir (septembar 2026, strane ekipe) nije omladinska liga KS: bez kategorije lige ('ostalo'), pa ne ulazi u
-- tabelu ni statistiku kategorije, a sync feeda ga ne prepiše (kategorija se mijenja samo kad je prazna).
update public.fiba_games set category = 'ostalo' where id in (2893117, 2893120, 2893122);
