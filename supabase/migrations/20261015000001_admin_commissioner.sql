-- Admin (savez) koji je ujedno i komesar: delegiranje ga nudi za poziciju komesara.
-- Za role = commissioner oznaka nije potrebna (komesar je po ulozi).
alter table public.profiles add column is_commissioner boolean not null default false;
