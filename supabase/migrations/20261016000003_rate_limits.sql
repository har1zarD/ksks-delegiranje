-- Rate limit za javne ulaze (prijava, nova šifra, OAuth, MCP): brojač po ključu (npr. "login:ip:1.2.3.4") u fiksnom prozoru.
-- Brojač je u bazi, a ne u memoriji, jer Vercel pokreće više instanci. Poziva ga samo server (servisni ključ).

create table public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 1,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;

-- Broji pokušaj i vraća true dok je unutar limita (p_max pokušaja u p_window_seconds sekundi)
create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_limits (key, window_start) values (p_key, w)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into n;

  -- Povremeno čišćenje starih prozora (otprilike svaki stoti poziv)
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return n <= p_max;
end $$;

revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
