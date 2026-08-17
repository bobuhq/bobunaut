begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Leadership Transfer RPC v1
--
-- Current Colony Leader transfers operational leadership
-- to another active member of the same Colony.
--
-- Founder identity is immutable.
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================

create or replace function public.transfer_my_mars_colony_leadership(
  p_target_builder_id uuid
)
returns table (
  colony_id uuid,
  colony_name text,
  previous_leader_builder_id uuid,
  new_leader_builder_id uuid,
  transferred_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_builder_id uuid := auth.uid();
  v_colony_id uuid;
  v_colony_name text;
  v_founder_builder_id uuid;
  v_transferred_at timestamptz := now();
begin
  if v_actor_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_target_builder_id is null then
    raise exception 'TARGET_BUILDER_REQUIRED'
      using errcode = '22023';
  end if;

  if p_target_builder_id = v_actor_builder_id then
    raise exception 'TARGET_ALREADY_LEADER'
      using errcode = '22023';
  end if;

  select
    c.id,
    c.name,
    c.founder_builder_id
  into
    v_colony_id,
    v_colony_name,
    v_founder_builder_id
  from public.mars_colonies c
  where c.leader_builder_id = v_actor_builder_id
    and c.status = 'active'
  limit 1
  for update;

  if v_colony_id is null then
    raise exception 'COLONY_LEADER_REQUIRED'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.mars_colony_memberships target
    where target.colony_id = v_colony_id
      and target.builder_id = p_target_builder_id
      and target.status = 'active'
  ) then
    raise exception 'TARGET_ACTIVE_MEMBER_REQUIRED'
      using errcode = '22023';
  end if;

  update public.mars_colonies
  set
    leader_builder_id = p_target_builder_id,
    updated_at = v_transferred_at
  where id = v_colony_id;

  update public.mars_colony_memberships as membership
  set
    role = case
      when membership.builder_id = v_actor_builder_id
           and membership.builder_id = v_founder_builder_id
        then 'founder'
      when membership.builder_id = v_actor_builder_id
        then 'member'
      when membership.builder_id = p_target_builder_id
        then 'leader'
      else membership.role
    end,
    updated_at = v_transferred_at
  where membership.colony_id = v_colony_id
    and membership.status = 'active'
    and membership.builder_id in (
      v_actor_builder_id,
      p_target_builder_id
    );

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
    'leadership_transferred',
    'leadership_transferred:' ||
      v_transferred_at::text ||
      ':' ||
      p_target_builder_id::text,
    v_actor_builder_id,
    p_target_builder_id,
    'Colony Leadership Transferred',
    'Operational leadership of ' ||
      v_colony_name ||
      ' was transferred to another Builder.',
    jsonb_build_object(
      'previous_leader_builder_id', v_actor_builder_id,
      'new_leader_builder_id', p_target_builder_id,
      'founder_builder_id', v_founder_builder_id
    ),
    v_transferred_at
  );

  return query
  select
    v_colony_id,
    v_colony_name,
    v_actor_builder_id,
    p_target_builder_id,
    v_transferred_at;
end;
$$;

revoke all
on function public.transfer_my_mars_colony_leadership(uuid)
from public, anon, authenticated;

grant execute
on function public.transfer_my_mars_colony_leadership(uuid)
to authenticated;

comment on function public.transfer_my_mars_colony_leadership(uuid) is
'Transfers operational leadership of the authenticated Leader active Mars Colony to another active member. Founder identity remains immutable. Awards no GP.';

commit;
