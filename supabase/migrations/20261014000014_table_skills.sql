-- Šta pomoćna sudija zna raditi za stolom: zapisnik (i pom. zapisnik), glavno vrijeme (semafor), 24/14, statistika.
-- Podrazumijevano sve; savez ručno isključuje u Ljudima. Delegiranje nudi osobu samo za pozicije koje zna.
alter table public.profiles
  add column table_skills text[] not null default array['scorer', 'timer', 'shot_clock', 'stats']
  check (table_skills <@ array['scorer', 'timer', 'shot_clock', 'stats']);
