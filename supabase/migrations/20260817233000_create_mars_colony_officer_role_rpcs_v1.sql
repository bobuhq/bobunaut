begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Colony Officer Role RPCs v1
--
-- Current Colony Leader may promote active members to Officer
-- or demote Officers back to Member.
--
-- Founder and Leader roles cannot be overwritten here.
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================

create or replace function public.promote_mars_colony_officer(
  p_target_builder_id uuid
)
returns table (
  colony_id uuid,
  colony_name text,
  target_builder_id uuid,
  previous_role text,
  new_role text,
  changed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_builder_id uuid := auth.uid();
  v_colony_id uuid;
  v_colony_name text;
  v_target_role text;
  v_changed_at timestamptz := now();
begin
  if v_actor_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_target_builder_id is null then
    raise exception 'TARGET_BUILDER_REQUIRED'
      using errcode = '22023';
  end if;

  select
    c.id,
    c.name
  into
    v_colony_id,
    v_colony_name
  from public.mars_colonies c
  where c.leader_builder_id = v_actor_builder_id
    and c.status = 'active'
  limit 1;

  if v_colony_id is null then
    raise exception 'COLONY_LEADER_REQUIRED'
      using errcode = '42501';
  end if;

  select membership.role
  into v_target_role
  from public.mars_colony_memberships membership
  where membership.colony_id = v_colony_id
    and membership.builder_id = p_target_builder_id
    and membership.status = 'active'
  limit 1
  for update;

  if v_target_role is null then
    raise exception 'TARGET_ACTIVE_MEMBER_REQUIRED'
      using errcode = '22023';
  end if;

  if v_target_role = 'founder' then
    raise exception 'FOUNDER_ROLE_IMMUTABLE'
      using errcode = '42501';
  end if;

  if v_target_role = 'leader' then
    raise exception 'TARGET_IS_LEADER'
      using errcode = '22023';
  end if;

  if v_target_role = 'officer' then
    raise exception 'TARGET_ALREADY_OFFICER'
      using errcode = '23505';
  end if;

  if v_target_role <> 'member' then
    raise exception 'INVALID_TARGET_ROLE'
      using errcode = '22023';
  end if;

  update public.mars_colony_memberships as membership
  set
    role = 'officer',
    updated_at = v_changed_at
  where membership.colony_id = v_colony_id
    and membership.builder_id = p_target_builder_id
    and membership.status = 'active'
    and membership.role = 'member';

  if not found then
    raise exception 'MEMBERSHIP_STATE_CHANGED'
      using errcode = '40001';
  end if;

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
    v_colony_id,
    'officer_promoted',
    'officer_promoted:' ||
      p_target_builder_id::text ||
      ':' ||
      v_changed_at::text,
    v_actor_builder_id,
    p_target_builder_id,
    'Colony Officer Promoted',
    'A Builder was promoted to Colony Officer in ' ||
      v_colony_name || '.',
    jsonb_build_object(
      'previous_role', v_target_role,
      'new_role', 'officer'
    ),
    v_changed_at
  );

  return query
  select
    v_colony_id,
    v_colony_name,
    p_target_builder_id,
    v_target_role,
    'officer'::text,
    v_changed_at;
end;
$$;


create or replace function public.demote_mars_colony_officer(
  p_target_builder_id uuid
)
returns table (
  colony_id uuid,
  colony_name text,
  target_builder_id uuid,
  previous_role text,
  new_role text,
  changed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_builder_id uuid := auth.uid();
  v_colony_id uuid;
  v_colony_name text;
  v_target_role text;
  v_changed_at timestamptz := now();
begin
  if v_actor_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_target_builder_id is null then
    raise exception 'TARGET_BUILDER_REQUIRED'
      using errcode = '22023';
  end if;

  select
    c.id,
    c.name
  into
    v_colony_id,
    v_colony_name
  from public.mars_colonies c
  where c.leader_builder_id = v_actor_builder_id
    and c.status = 'active'
  limit 1;

  if v_colony_id is null then
    raise exception 'COLONY_LEADER_REQUIRED'
      using errcode = '42501';
  end if;

  select membership.role
  into v_target_role
  from public.mars_colony_memberships membership
  where membership.colony_id = v_colony_id
    and membership.builder_id = p_target_builder_id
    and membership.status = 'active'
  limit 1
  for update;

  if v_target_role is null then
    raise exception 'TARGET_ACTIVE_MEMBER_REQUIRED'
      using errcode = '22023';
  end if;

  if v_target_role <> 'officer' then
    raise exception 'TARGET_OFFICER_REQUIRED'
      using errcode = '22023';
  end if;

  update public.mars_colony_memberships as membership
  set
    role = 'member',
    updated_at = v_changed_at
  where membership.colony_id = v_colony_id
    and membership.builder_id = p_target_builder_id
    and membership.status = 'active'
    and membership.role = 'officer';

  if not found then
    raise exception 'MEMBERSHIP_STATE_CHANGED'
      using errcode = '40001';
  end if;

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
    v_colony_id,
    'officer_demoted',
    'officer_demoted:' ||
      p_target_builder_id::text ||
      ':' ||
      v_changed_at::text,
    v_actor_builder_id,
    p_target_builder_id,
    'Colony Officer Demoted',
    'A Colony Officer was returned to Member status in ' ||
      v_colony_name || '.',
    jsonb_build_object(
      'previous_role', v_target_role,
      'new_role', 'member'
    ),
    v_changed_at
  );

  return query
  select
    v_colony_id,
    v_colony_name,
    p_target_builder_id,
    v_target_role,
    'member'::text,
    v_changed_at;
end;
$$;


revoke all
on function public.promote_mars_colony_officer(uuid)
from public, anon, authenticated;

revoke all
on function public.demote_mars_colony_officer(uuid)
from public, anon, authenticated;

grant execute
on function public.promote_mars_colony_officer(uuid)
to authenticated;

grant execute
on function public.demote_mars_colony_officer(uuid)
to authenticated;

comment on function public.promote_mars_colony_officer(uuid) is
'Promotes an active Member of the authenticated Leader Mars Colony to Officer. Awards no GP.';

comment on function public.demote_mars_colony_officer(uuid) is
'Demotes an active Officer of the authenticated Leader Mars Colony to Member. Awards no GP.';

commit;
