-- ============================================================
-- BOBU UNIVERSE
-- Builder Profile + Immutable Reward Ledger + Atomic GP Engine
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- BUILDER PROFILES
-- One canonical profile row per authenticated Builder.
-- GP stored here is a cached balance maintained only by the
-- server-side reward function.
-- ============================================================

create table if not exists public.builder_profiles (
  builder_id uuid primary key
    references auth.users(id)
    on delete cascade,

  username text,
  display_name text,

  level integer not null default 1
    check (level >= 1),

  xp bigint not null default 0
    check (xp >= 0),

  gp bigint not null default 0
    check (gp >= 0),

  reputation bigint not null default 0
    check (reputation >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists builder_profiles_gp_idx
  on public.builder_profiles(gp desc);

create index if not exists builder_profiles_level_idx
  on public.builder_profiles(level desc);


-- ============================================================
-- REWARD LEDGER
-- Immutable source of truth for every GP reward.
--
-- Future reward sources:
-- telegram verification
-- X verification
-- Instagram verification
-- missions
-- mobile mining
-- referrals
-- galaxy activity
-- achievements
-- ============================================================

create table if not exists public.builder_reward_ledger (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references auth.users(id)
    on delete cascade,

  reward_type text not null
    check (char_length(trim(reward_type)) between 1 and 100),

  provider text,

  amount bigint not null
    check (amount > 0),

  idempotency_key text not null
    check (char_length(trim(idempotency_key)) between 1 and 255),

  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),

  created_at timestamptz not null default now(),

  constraint builder_reward_ledger_builder_idempotency_unique
    unique (builder_id, idempotency_key)
);


create index if not exists builder_reward_ledger_builder_idx
  on public.builder_reward_ledger(builder_id);

create index if not exists builder_reward_ledger_created_idx
  on public.builder_reward_ledger(created_at desc);

create index if not exists builder_reward_ledger_reward_type_idx
  on public.builder_reward_ledger(reward_type);

create index if not exists builder_reward_ledger_provider_idx
  on public.builder_reward_ledger(provider)
  where provider is not null;


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.bobu_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists builder_profiles_set_updated_at
  on public.builder_profiles;

create trigger builder_profiles_set_updated_at
before update on public.builder_profiles
for each row
execute function public.bobu_set_updated_at();


-- ============================================================
-- IMMUTABLE LEDGER PROTECTION
-- Ledger rows may never be updated or deleted.
-- Corrections must be represented by a separate future
-- adjustment/reversal ledger entry.
-- ============================================================

create or replace function public.prevent_reward_ledger_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception
    'builder_reward_ledger is immutable; update and delete operations are not allowed';
end;
$$;


drop trigger if exists prevent_builder_reward_ledger_update
  on public.builder_reward_ledger;

create trigger prevent_builder_reward_ledger_update
before update on public.builder_reward_ledger
for each row
execute function public.prevent_reward_ledger_mutation();


drop trigger if exists prevent_builder_reward_ledger_delete
  on public.builder_reward_ledger;

create trigger prevent_builder_reward_ledger_delete
before delete on public.builder_reward_ledger
for each row
execute function public.prevent_reward_ledger_mutation();


-- ============================================================
-- ROW LEVEL SECURITY
-- Builders may read only their own profile and ledger.
-- Browser clients receive no direct INSERT, UPDATE or DELETE
-- policies for rewards or GP balances.
-- ============================================================

alter table public.builder_profiles
  enable row level security;

alter table public.builder_reward_ledger
  enable row level security;


drop policy if exists
  "Builders can read their own profile"
  on public.builder_profiles;

create policy
  "Builders can read their own profile"
on public.builder_profiles
for select
to authenticated
using (auth.uid() = builder_id);


drop policy if exists
  "Builders can read their own reward ledger"
  on public.builder_reward_ledger;

create policy
  "Builders can read their own reward ledger"
on public.builder_reward_ledger
for select
to authenticated
using (auth.uid() = builder_id);


-- Explicit table privileges.
-- Authenticated users can only read through RLS.
-- All writes are performed by trusted server-side functions.

revoke all on table public.builder_profiles
  from anon, authenticated;

revoke all on table public.builder_reward_ledger
  from anon, authenticated;

grant select on table public.builder_profiles
  to authenticated;

grant select on table public.builder_reward_ledger
  to authenticated;


-- ============================================================
-- ATOMIC GP AWARD FUNCTION
--
-- Guarantees:
-- 1. Reward ledger insert and GP balance update happen in one
--    database transaction.
-- 2. The same idempotency key cannot reward the same Builder
--    twice.
-- 3. Browser clients cannot call this function.
-- 4. The caller cannot award zero or negative GP.
-- ============================================================

create or replace function public.award_builder_gp(
  p_builder_id uuid,
  p_reward_type text,
  p_amount bigint,
  p_idempotency_key text,
  p_provider text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  awarded boolean,
  total_gp bigint,
  ledger_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ledger_id uuid;
  v_total_gp bigint;
begin
  if p_builder_id is null then
    raise exception 'Builder ID is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Reward amount must be greater than zero';
  end if;

  if p_reward_type is null
     or char_length(trim(p_reward_type)) = 0 then
    raise exception 'Reward type is required';
  end if;

  if p_idempotency_key is null
     or char_length(trim(p_idempotency_key)) = 0 then
    raise exception 'Idempotency key is required';
  end if;

  if p_metadata is null
     or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'Reward metadata must be a JSON object';
  end if;

  insert into public.builder_profiles (
    builder_id
  )
  values (
    p_builder_id
  )
  on conflict (builder_id) do nothing;

  insert into public.builder_reward_ledger (
    builder_id,
    reward_type,
    provider,
    amount,
    idempotency_key,
    metadata
  )
  values (
    p_builder_id,
    trim(p_reward_type),
    nullif(trim(p_provider), ''),
    p_amount,
    trim(p_idempotency_key),
    p_metadata
  )
  on conflict (builder_id, idempotency_key)
  do nothing
  returning id into v_ledger_id;

  if v_ledger_id is null then
    select profile.gp
    into v_total_gp
    from public.builder_profiles as profile
    where profile.builder_id = p_builder_id;

    return query
    select
      false,
      coalesce(v_total_gp, 0),
      null::uuid;

    return;
  end if;

  update public.builder_profiles
  set gp = gp + p_amount
  where builder_id = p_builder_id
  returning gp into v_total_gp;

  return query
  select
    true,
    v_total_gp,
    v_ledger_id;
end;
$$;


-- Remove PostgreSQL's default public function execution rights.
-- Only the trusted Supabase service role may award GP.

revoke all on function public.award_builder_gp(
  uuid,
  text,
  bigint,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.award_builder_gp(
  uuid,
  text,
  bigint,
  text,
  text,
  jsonb
) to service_role;


-- Internal trigger functions should not be directly callable.

revoke all on function public.bobu_set_updated_at()
  from public, anon, authenticated;

revoke all on function public.prevent_reward_ledger_mutation()
  from public, anon, authenticated;


comment on table public.builder_profiles is
  'Canonical Builder profile and cached GP balance. GP may only be changed by trusted server-side reward operations.';

comment on table public.builder_reward_ledger is
  'Immutable ledger containing every Builder GP reward.';

comment on function public.award_builder_gp(
  uuid,
  text,
  bigint,
  text,
  text,
  jsonb
) is
  'Atomically creates an immutable reward ledger entry and increments the Builder GP balance exactly once.';
