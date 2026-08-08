-- ============================================================
-- BOBU UNIVERSE
-- Pending Network GP ambiguity fix
--
-- Production fix for award_pending_network_gp().
--
-- PostgreSQL previously interpreted pending_network_gp as
-- both the RETURNS TABLE output field and builder_profiles
-- column. Qualifying the profile column removes SQLSTATE 42702.
--
-- No economy rules are changed.
-- No balances are modified by this migration itself.
-- ============================================================

begin;

create or replace function
public.award_pending_network_gp(
  p_builder_id uuid,
  p_source_builder_id uuid,
  p_amount bigint,
  p_source_reward_type text,
  p_source_reference text,
  p_depth integer,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  awarded boolean,
  pending_network_gp bigint,
  eligible_network_gp bigint,
  total_gp bigint,
  ledger_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ledger_id uuid;
  v_valid_relationship boolean := false;
  v_pending_network_gp bigint;
  v_eligible_network_gp bigint;
  v_total_gp bigint;
begin
  if p_builder_id is null then
    raise exception
      'Network GP recipient Builder ID is required';
  end if;

  if p_source_builder_id is null then
    raise exception
      'Network GP source Builder ID is required';
  end if;

  if p_builder_id = p_source_builder_id then
    raise exception
      'A Builder cannot generate Network GP for themselves';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception
      'Network GP amount must be greater than zero';
  end if;

  if p_depth is null or p_depth not between 1 and 10 then
    raise exception
      'Network GP depth must be between 1 and 10';
  end if;

  if p_source_reward_type is null
     or char_length(trim(p_source_reward_type)) = 0 then
    raise exception
      'Source reward type is required';
  end if;

  if p_source_reference is null
     or char_length(trim(p_source_reference)) = 0 then
    raise exception
      'Source reference is required';
  end if;

  if p_idempotency_key is null
     or char_length(trim(p_idempotency_key)) = 0 then
    raise exception
      'Idempotency key is required';
  end if;

  if p_metadata is null
     or jsonb_typeof(p_metadata) <> 'object' then
    raise exception
      'Network GP metadata must be a JSON object';
  end if;

  insert into public.builder_profiles (
    builder_id
  )
  values (
    p_builder_id
  )
  on conflict (builder_id) do nothing;

  insert into public.builder_profiles (
    builder_id
  )
  values (
    p_source_builder_id
  )
  on conflict (builder_id) do nothing;

  /*
   * Walk upward from the source Builder.
   * The supplied recipient must be the exact ancestor at
   * the supplied depth.
   */
  with recursive referral_ancestry as (
    select
      referral.referrer_id as ancestor_id,
      referral.referred_id as descendant_id,
      1 as depth
    from public.builder_referrals as referral
    where referral.referred_id =
      p_source_builder_id

    union all

    select
      parent.referrer_id as ancestor_id,
      ancestry.ancestor_id as descendant_id,
      ancestry.depth + 1 as depth
    from referral_ancestry as ancestry
    join public.builder_referrals as parent
      on parent.referred_id =
        ancestry.ancestor_id
    where ancestry.depth < 10
  )
  select exists (
    select 1
    from referral_ancestry as ancestry
    where ancestry.ancestor_id = p_builder_id
      and ancestry.depth = p_depth
  )
  into v_valid_relationship;

  if not v_valid_relationship then
    raise exception
      'The Network GP recipient is not the verified ancestor at the supplied depth';
  end if;

  insert into public.builder_network_gp_ledger (
    builder_id,
    source_builder_id,
    source_reward_type,
    source_reference,
    amount,
    depth,
    status,
    idempotency_key,
    metadata
  )
  values (
    p_builder_id,
    p_source_builder_id,
    trim(p_source_reward_type),
    trim(p_source_reference),
    p_amount,
    p_depth,
    'pending',
    trim(p_idempotency_key),
    p_metadata
  )
  on conflict (
    builder_id,
    idempotency_key
  )
  do nothing
  returning id into v_ledger_id;

  if v_ledger_id is not null then
    update public.builder_profiles as profile
    set pending_network_gp =
      profile.pending_network_gp + p_amount
    where profile.builder_id = p_builder_id;
  end if;

  select
    profile.pending_network_gp,
    profile.eligible_network_gp,
    profile.gp
  into
    v_pending_network_gp,
    v_eligible_network_gp,
    v_total_gp
  from public.builder_profiles as profile
  where profile.builder_id = p_builder_id;

  return query
  select
    v_ledger_id is not null,
    coalesce(v_pending_network_gp, 0),
    coalesce(v_eligible_network_gp, 0),
    coalesce(v_total_gp, 0),
    v_ledger_id;
end;
$$;

revoke all
on function public.award_pending_network_gp(
  uuid,
  uuid,
  bigint,
  text,
  text,
  integer,
  text,
  jsonb
)
from public, anon, authenticated;

grant execute
on function public.award_pending_network_gp(
  uuid,
  uuid,
  bigint,
  text,
  text,
  integer,
  text,
  jsonb
)
to service_role;

comment on function
public.award_pending_network_gp(
  uuid,
  uuid,
  bigint,
  text,
  text,
  integer,
  text,
  jsonb
) is
'Validates referral ancestry and atomically credits idempotent Pending Network GP without changing eligible or total GP.';

commit;
