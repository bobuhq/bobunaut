begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Colony Join Decision RPCs v1
--
-- Founder / Leader only.
-- Approve / Reject pending requests.
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================

create or replace function public.approve_mars_colony_join_request(
  p_membership_id uuid
)
returns table (
  membership_id uuid,
  colony_id uuid,
  builder_id uuid,
  membership_status text,
  joined_at timestamptz,
  member_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_builder_id uuid := auth.uid();
  v_colony_id uuid;
  v_target_builder_id uuid;
  v_joined_at timestamptz := now();
  v_member_count bigint;
begin
  if v_actor_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_membership_id is null then
    raise exception 'MEMBERSHIP_REQUIRED'
      using errcode = '22023';
  end if;

  select
    m.colony_id,
    m.builder_id
  into
    v_colony_id,
    v_target_builder_id
  from public.mars_colony_memberships m
  where m.id = p_membership_id
    and m.status = 'requested'
  for update;

  if v_colony_id is null then
    raise exception 'JOIN_REQUEST_NOT_AVAILABLE'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.mars_colony_memberships manager
    join public.mars_colonies c
      on c.id = manager.colony_id
    where manager.builder_id = v_actor_builder_id
      and manager.colony_id = v_colony_id
      and manager.status = 'active'
      and manager.role in ('founder', 'leader')
      and c.status = 'active'
  ) then
    raise exception 'COLONY_MANAGEMENT_REQUIRED'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.mars_colony_memberships active_membership
    where active_membership.builder_id = v_target_builder_id
      and active_membership.status = 'active'
  ) then
    raise exception 'TARGET_ALREADY_HAS_ACTIVE_COLONY'
      using errcode = '23505';
  end if;

  update public.mars_colony_memberships
  set
    status = 'active',
    role = 'member',
    joined_at = v_joined_at,
    left_at = null,
    updated_at = v_joined_at
  where id = p_membership_id
    and status = 'requested';

  if not found then
    raise exception 'JOIN_REQUEST_STATE_CHANGED'
      using errcode = '40001';
  end if;

  update public.mars_colonies as colony
  set
    member_count = colony.member_count + 1,
    updated_at = v_joined_at
  where colony.id = v_colony_id
  returning colony.member_count
  into v_member_count;

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
    'member_joined',
    'member_joined:' || p_membership_id::text,
    v_actor_builder_id,
    v_target_builder_id,
    'Builder Joined Colony',
    'A Builder joined the Colony.',
    jsonb_build_object(
      'membership_id', p_membership_id
    ),
    v_joined_at
  );

  return query
  select
    m.id,
    m.colony_id,
    m.builder_id,
    m.status,
    m.joined_at,
    v_member_count
  from public.mars_colony_memberships m
  where m.id = p_membership_id;
end;
$$;


create or replace function public.reject_mars_colony_join_request(
  p_membership_id uuid
)
returns table (
  membership_id uuid,
  colony_id uuid,
  builder_id uuid,
  membership_status text,
  resolved_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_builder_id uuid := auth.uid();
  v_colony_id uuid;
  v_target_builder_id uuid;
  v_resolved_at timestamptz := now();
begin
  if v_actor_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_membership_id is null then
    raise exception 'MEMBERSHIP_REQUIRED'
      using errcode = '22023';
  end if;

  select
    m.colony_id,
    m.builder_id
  into
    v_colony_id,
    v_target_builder_id
  from public.mars_colony_memberships m
  where m.id = p_membership_id
    and m.status = 'requested'
  for update;

  if v_colony_id is null then
    raise exception 'JOIN_REQUEST_NOT_AVAILABLE'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.mars_colony_memberships manager
    join public.mars_colonies c
      on c.id = manager.colony_id
    where manager.builder_id = v_actor_builder_id
      and manager.colony_id = v_colony_id
      and manager.status = 'active'
      and manager.role in ('founder', 'leader')
      and c.status = 'active'
  ) then
    raise exception 'COLONY_MANAGEMENT_REQUIRED'
      using errcode = '42501';
  end if;

  update public.mars_colony_memberships
  set
    status = 'removed',
    left_at = v_resolved_at,
    updated_at = v_resolved_at
  where id = p_membership_id
    and status = 'requested';

  if not found then
    raise exception 'JOIN_REQUEST_STATE_CHANGED'
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
    'join_rejected',
    'join_rejected:' || p_membership_id::text,
    v_actor_builder_id,
    v_target_builder_id,
    'Colony Join Rejected',
    'A Colony join request was rejected.',
    jsonb_build_object(
      'membership_id', p_membership_id
    ),
    v_resolved_at
  );

  return query
  select
    m.id,
    m.colony_id,
    m.builder_id,
    m.status,
    v_resolved_at
  from public.mars_colony_memberships m
  where m.id = p_membership_id;
end;
$$;


revoke all
on function public.approve_mars_colony_join_request(uuid)
from public, anon, authenticated;

revoke all
on function public.reject_mars_colony_join_request(uuid)
from public, anon, authenticated;

grant execute
on function public.approve_mars_colony_join_request(uuid)
to authenticated;

grant execute
on function public.reject_mars_colony_join_request(uuid)
to authenticated;

comment on function public.approve_mars_colony_join_request(uuid) is
'Approves a pending Mars Colony join request for the authenticated Founder or Leader Colony. Awards no GP.';

comment on function public.reject_mars_colony_join_request(uuid) is
'Rejects a pending Mars Colony join request for the authenticated Founder or Leader Colony. Awards no GP.';

commit;
