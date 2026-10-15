-- Pomoćni semafor (seniori, ABA liga): pomoćna sudija uz glavno vrijeme → nova pozicija assistant_timer ("Pom. semafor").
alter type public.assignment_position add value if not exists 'assistant_timer' after 'timer';

alter table public.matches add column has_assistant_timer boolean not null default false;
alter table public.competitions add column assistant_timer_default boolean not null default false;
