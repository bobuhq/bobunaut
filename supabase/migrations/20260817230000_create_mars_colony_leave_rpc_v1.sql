begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Leave Colony RPC v1
--
-- Members / Officers may leave.
-- Founder / Leader must transfer control first.
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================

create or replace function public.leave_my_mars_colony()
returns table (
  membership_id uuid,
  colony_id uuid,
  colony_name text,
  membership_status text,
  left_at timestamptz,
  member_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_membership_id uuid;
  v_colony_id uuid;
  v_colony_name text;
  v_role text;
  v_left_at timestamptz := now();
  v_member_count bigint;
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  select
    m.id,
    m.colony_id,
    c.name,
    m.role
  into
    v_membership_id,
    v_colony_id,
    v_colony_name,
    v_role
  from public.mars_colony_memberships m
  join public.mars_colonies c
    on c.id = m.colony_id
  where m.builder_id = v_builder_id
    and m.status = 'active'
    and c.status = 'active'
  limit 1
  for update of m;

  if v_membership_id is null then
    raise exception 'ACTIVE_COLONY_MEMBERSHIP_REQUIRED'
      using errcode = '22023';
  end if;

  if v_role = 'founder' then
    raise exception 'FOUNDER_TRANSFER_REQUIRED'
      using errcode = '42501';
  end if;

  if v_role = 'leader' then
    raise exception 'LEADERSHIP_TRANSFER_REQUIRED'
      using errcode = '42501';
  end if;

  update public.mars_colony_memberships
  set
    status = 'left',
    left_at = v_left_at,
    updated_at = v_left_at
  where id = v_membership_id
    and status = 'active';

  if not found then
    raise exception 'MEMBERSHIP_STATE_CHANGED'
      using errcode = '40001';
  end if;

  update public.mars_colonies as colony
  set
    member_count = greatest(colony.member_count - 1, 0),
    updated_at = v_left_at
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
    'member_left',
    'member_left:' || v_membership_id::text,
    v_builder_id,
    v_builder_id,
    'Builder Left Colony',
    'A Builder left ' || v_colony_name || '.',
    jsonb_build_object(
      'membership_id', v_membership_id,
      'previous_role', v_role
    ),
    v_left_at
  );

  return query
  select
    v_membership_id,
    v_colony_id,
    v_colony_name,
    'left'::text,
    v_left_at,
    v_member_count;
end;
$$;

revoke all
on function public.leave_my_mars_colony()
from public, anon, authenticated;

grant execute
on function public.leave_my_mars_colony()
to authenticated;

comment on function public.leave_my_mars_colony() is
'Leaves the authenticated Builder active Mars Colony when the Builder is not Founder or Leader. Awards no GP.';

commit;
