-- ============================================================
-- BOBU UNIVERSE
-- Pending Network GP Award Engine
--
-- Network GP begins in a locked pending balance.
-- Pending Network GP:
--   - does not count toward total GP,
--   - cannot be spent,
--   - cannot migrate to the wallet,
--   - may later be promoted after eligibility checks.
-- ============================================================


-- ============================================================
-- IMMUTABLE NETWORK GP LEDGER
-- ============================================================

create table if not exists public.builder_network_gp_ledger (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  source_builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  source_reward_type text not null
    check (
      char_length(trim(source_reward_type))
      between 1 and 100
    ),

  source_reference text not null
    check (
      char_length(trim(source_reference))
      between 1 and 255
    ),

  amount bigint not null
    check (amount > 0),

  depth integer not null
    check (depth between 1 and 10),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'eligible',
        'reversed'
      )
    ),

  idempotency_key text not null
    check (
      char_length(trim(idempotency_key))
      between 1 and 255
    ),

  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),

  created_at timestamptz not null default now(),
  promoted_at timestamptz,
  reversed_at timestamptz,

  constraint
    builder_network_gp_no_self_source
    check (builder_id <> source_builder_id),

  constraint
    builder_network_gp_idempotency_unique
    unique (builder_id, idempotency_key)
);


create index if not exists
  builder_network_gp_ledger_builder_idx
on public.builder_network_gp_ledger(
  builder_id,
  created_at desc
);

create index if not exists
  builder_network_gp_ledger_source_idx
on public.builder_network_gp_ledger(
  source_builder_id,
  created_at desc
);

create index if not exists
  builder_network_gp_ledger_status_idx
on public.builder_network_gp_ledger(
  status,
  created_at desc
);

create index if not exists
  builder_network_gp_ledger_source_reference_idx
on public.builder_network_gp_ledger(
  source_reward_type,
  source_reference
);


-- ============================================================
-- RLS AND TABLE PRIVILEGES
-- ============================================================

alter table public.builder_network_gp_ledger
  enable row level security;


drop policy if exists
  "Builders can read their own Network GP ledger"
on public.builder_network_gp_ledger;

create policy
  "Builders can read their own Network GP ledger"
on public.builder_network_gp_ledger
for select
to authenticated
using (auth.uid() = builder_id);


revoke all
on table public.builder_network_gp_ledger
from anon, authenticated;

grant select
on table public.builder_network_gp_ledger
to authenticated;


-- ============================================================
-- IMMUTABILITY PROTECTION
--
-- Promotion and reversal support will be added later through
-- narrowly scoped server functions. Direct table mutations are
-- never available to browser clients.
-- ============================================================

create or replace function
public.prevent_network_gp_ledger_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception
    'builder_network_gp_ledger cannot be mutated directly';
end;
$$;


drop trigger if exists
  prevent_network_gp_ledger_delete
on public.builder_network_gp_ledger;

create trigger
  prevent_network_gp_ledger_delete
before delete
on public.builder_network_gp_ledger
for each row
execute function
  public.prevent_network_gp_ledger_mutation();


revoke all
on function public.prevent_network_gp_ledger_mutation()
from public, anon, authenticated;


-- ============================================================
-- PENDING NETWORK GP AWARD FUNCTION
--
-- Guarantees:
-- 1. Callable only by service_role.
-- 2. Validates the real referral ancestry.
-- 3. Validates the supplied depth, maximum 10.
-- 4. Prevents duplicate rewards through idempotency.
-- 5. Credits pending_network_gp only.
-- 6. Does not modify total GP.
-- ============================================================

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
    update public.builder_profiles
    set pending_network_gp =
      pending_network_gp + p_amount
    where builder_id = p_builder_id;
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


comment on table
public.builder_network_gp_ledger is
  'Immutable source ledger for Pending, Eligible and Reversed Network GP generated through the verified referral ancestry.';

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
