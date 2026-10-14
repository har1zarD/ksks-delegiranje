-- OAuth 2.1 za MCP connector (Claude "Add custom connector"): dinamička registracija klijenata i jednokratni kodovi.
-- Token koji se izda je običan lični MCP token (mcp_tokens), pa ga osoba vidi i opoziva u Postavkama.
-- Tabelama pristupa samo server (servisni ključ): RLS uključen, bez politika.

create table public.oauth_clients (
  id            text primary key,                 -- client_id (nasumičan)
  name          text not null,
  redirect_uris text[] not null check (cardinality(redirect_uris) between 1 and 10),
  created_at    timestamptz not null default now()
);

create table public.oauth_codes (
  code_hash      text primary key,                -- SHA-256 koda; sam kod se nigdje ne čuva
  client_id      text not null references public.oauth_clients (id) on delete cascade,
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  redirect_uri   text not null,
  code_challenge text not null,                   -- PKCE S256
  expires_at     timestamptz not null,
  used_at        timestamptz,
  created_at     timestamptz not null default now()
);

alter table public.oauth_clients enable row level security;
alter table public.oauth_codes enable row level security;

-- Token zna kojem connectoru pripada (prikaz u Postavkama)
alter table public.mcp_tokens add column oauth_client_id text references public.oauth_clients (id) on delete set null;
