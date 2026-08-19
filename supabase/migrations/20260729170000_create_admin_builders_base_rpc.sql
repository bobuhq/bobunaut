begin;

-- ============================================================
-- BOBU UNIVERSE
-- Admin Builders Base Read Model
--
-- Required by:
-- 20260729174500_create_admin_builder_intelligence.sql
--
-- Read-only.
-- Admin Console access only.
-- ============================================================

create or replace function public.get_admin_builders(
  p_limit integer default 25,
  p_offset integer default 0,
  p_search text default null
)
returns table (
  builder_id uuid,
  username text,
  display_name text,
  level integer,
  gp bigint,
  reputation bigint,
  referral_count bigint,
  invite_code text,
  created_at timestamptz,
  mining_active boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select
    profile.builder_id,
    profile.username,
    profile.display_name,
    profile.level,
    profile.gp,
    profile.reputation,
    coalesce(profile.referral_count, 0)::bigint,
    profile.invite_code,
    profile.created_at,

    exists (
      select 1
      from public.builder_mining_sessions as mining
      where mining.builder_id = profile.builder_id
        and mining.status = 'active'
        and mining.ends_at > now()
    ) as mining_active

  from public.builder_profiles as profile

  where
    (
      public.has_admin_console_access()
      or auth.role() = 'service_role'
    )
    and (
      p_search is null
      or trim(p_search) = ''
      or profile.builder_id::text ilike '%' || trim(p_search) || '%'
      or coalesce(profile.username, '') ilike '%' || trim(p_search) || '%'
      or coalesce(profile.display_name, '') ilike '%' || trim(p_search) || '%'
      or coalesce(profile.invite_code, '') ilike '%' || trim(p_search) || '%'
    )

  order by profile.created_at desc

  limit least(
    greatest(coalesce(p_limit, 25), 1),
    100
  )

  offset greatest(
    coalesce(p_offset, 0),
    0
  );
$function$;

revoke all
on function public.get_admin_builders(integer, integer, text)
from public, anon;

grant execute
on function public.get_admin_builders(integer, integer, text)
to authenticated, service_role;

comment on function public.get_admin_builders(
  integer,
  integer,
  text
) is
'Returns the protected base Builder list used by Admin Console Builder Intelligence.';

commit;
