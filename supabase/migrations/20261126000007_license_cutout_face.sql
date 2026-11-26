-- Okvir lica na izrezanoj fotografiji igrača (Apple Vision, scripts/license-cutouts.mjs): {x, y, w, h}, 0–1 od gornjeg
-- lijevog ugla slike. Slike statistike po njemu centriraju lice u krugu i odzumiraju fotografije koje su samo lice.
alter table public.licenses add column if not exists cutout_face real[];
