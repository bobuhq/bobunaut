begin;

create or replace function public.get_mars_colony_directory(
  p_limit integer default 50,
  p_offset integer default 0,
  p_search text default null
)
returns table (
  colony_id uuid,
  colony_code text,
  colony_name text,
  specialization text,
  colony_status text,
  member_count bigint,
  total_contribution bigint,
  founder_builder_id uuid,
  leader_builder_id uuid,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    c.colony_code,
    c.name,
    c.specialization,
    c.status,
    c.member_count,
    c.total_contribution,
    c.founder_builder_id,
    c.leader_builder_id,
    c.created_at
  from public.mars_colonies c
  where auth.uid() is not null
    and c.status = 'active'
    and (
      p_search is null
      or trim(p_search) = ''
      or c.name ilike '%' || trim(p_search) || '%'
      or c.colony_code ilike '%' || trim(p_search) || '%'
    )
  order by
    c.member_count desc,
    c.total_contribution desc,
    c.created_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all
on function public.get_mars_colony_directory(integer, integer, text)
from public, anon, authenticated;

grant execute
on function public.get_mars_colony_directory(integer, integer, text)
to authenticated;

comment on function public.get_mars_colony_directory(integer, integer, text) is
'Returns active Mars Colonies for authenticated Builders. Read-only directory.';

commit;
