begin;

create or replace function public.request_join_mars_colony(
  p_colony_id uuid
)
returns table (
  membership_id uuid,
  colony_id uuid,
  colony_name text,
  membership_status text,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_colony_name text;
  v_membership_id uuid;
  v_requested_at timestamptz := now();
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.builder_profiles bp
    where bp.builder_id = v_builder_id
  ) then
    raise exception 'BUILDER_PROFILE_REQUIRED'
      using errcode = '42501';
  end if;

  if p_colony_id is null then
    raise exception 'COLONY_REQUIRED'
      using errcode = '22023';
  end if;

  select c.name
  into v_colony_name
  from public.mars_colonies c
  where c.id = p_colony_id
    and c.status = 'active';

  if v_colony_name is null then
    raise exception 'COLONY_NOT_AVAILABLE'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.mars_colony_memberships m
    where m.builder_id = v_builder_id
      and m.status = 'active'
  ) then
    raise exception 'ACTIVE_COLONY_ALREADY_EXISTS'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.mars_colony_memberships m
    where m.builder_id = v_builder_id
      and m.colony_id = p_colony_id
      and m.status in ('requested', 'invited', 'leaving')
  ) then
    raise exception 'COLONY_REQUEST_ALREADY_EXISTS'
      using errcode = '23505';
  end if;

  insert into public.mars_colony_memberships (
    colony_id,
    builder_id,
    role,
    status,
    joined_at,
    created_at,
    updated_at
  )
  values (
    p_colony_id,
    v_builder_id,
    'member',
    'requested',
    null,
    v_requested_at,
    v_requested_at
  )
  returning id
  into v_membership_id;

  insert into public.mars_colony_history (
    colony_id,
    event_type,
    event_key,
    actor_builder_id,
    subject_builder_id,
    title,
    description,
    metadata,
    created_at
  )
  values (
    p_colony_id,
    'join_requested',
    'join_requested:' || v_membership_id::text,
    v_builder_id,
    v_builder_id,
    'Colony Join Requested',
    'A Builder requested membership in ' || v_colony_name || '.',
    jsonb_build_object(
      'membership_id', v_membership_id
    ),
    v_requested_at
  );

  return query
  select
    v_membership_id,
    p_colony_id,
    v_colony_name,
    'requested'::text,
    v_requested_at;
end;
$$;

revoke all
on function public.request_join_mars_colony(uuid)
from public, anon, authenticated;

grant execute
on function public.request_join_mars_colony(uuid)
to authenticated;

comment on function public.request_join_mars_colony(uuid) is
'Creates one pending Mars Colony join request for an authenticated Builder with no active Colony. Awards no GP.';

commit;
