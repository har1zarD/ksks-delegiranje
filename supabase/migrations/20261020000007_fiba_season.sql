-- FIBA statistika po sezoni (1. 7. – 30. 6., sarajevsko vrijeme): tabela i prosjeci se ne miješaju između sezona
-- (omladinska liga KS na FIBA LiveStats ima i utakmice sezone 2025/26).
create or replace function public.fiba_season(at timestamptz)
returns text
language sql immutable parallel safe
as $$
  select case when at is null then null else
    (extract(year from at at time zone 'Europe/Sarajevo')::int - case when extract(month from at at time zone 'Europe/Sarajevo') < 7 then 1 else 0 end)::text
    || '/' || lpad(((extract(year from at at time zone 'Europe/Sarajevo')::int - case when extract(month from at at time zone 'Europe/Sarajevo') < 7 then 1 else 0 end + 1) % 100)::text, 2, '0')
  end
$$;

-- Nova kolona ide na kraj (create or replace view)
create or replace view public.fiba_player_season with (security_invoker = true) as
select
  p.player_id,
  g.category,
  (array_agg(p.first_name order by g.starts_at desc))[1] as first_name,
  (array_agg(p.family_name order by g.starts_at desc))[1] as family_name,
  (array_agg(p.number order by g.starts_at desc))[1] as number,
  (array_agg(p.team_name order by g.starts_at desc))[1] as team_name,
  count(*)::int as games,
  count(*) filter (where p.starter)::int as starts,
  sum(p.seconds)::int as seconds,
  sum(p.pts)::int as pts, sum(p.fgm)::int as fgm, sum(p.fga)::int as fga,
  sum(p.tpm)::int as tpm, sum(p.tpa)::int as tpa, sum(p.ftm)::int as ftm, sum(p.fta)::int as fta,
  sum(p.oreb)::int as oreb, sum(p.dreb)::int as dreb, sum(p.reb)::int as reb,
  sum(p.ast)::int as ast, sum(p.stl)::int as stl, sum(p.blk)::int as blk,
  sum(p.tov)::int as tov, sum(p.pf)::int as pf, sum(p.fd)::int as fd,
  sum(p.plus_minus)::int as plus_minus, sum(p.eff)::int as eff,
  max(p.pts)::int as best_pts,
  public.fiba_season(g.starts_at) as season
from public.fiba_player_games p
join public.fiba_games g on g.id = p.game_id
where p.seconds > 0
group by p.player_id, g.category, public.fiba_season(g.starts_at);

revoke all on public.fiba_player_season from anon, authenticated;
