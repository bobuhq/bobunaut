-- ============================================================
-- BOBU UNIVERSE
-- Server-Authoritative Achievement Reward Claim Engine
-- ============================================================


-- ============================================================
-- ACHIEVEMENT REWARD CATALOG
--
-- This table is the server-side authority for Achievement GP
-- rewards. Browser clients cannot read or modify it directly.
-- ============================================================

create table if not exists public.achievement_reward_catalog (
  achievement_id text primary key
    check (
      char_length(trim(achievement_id))
      between 1 and 150
    ),

  reward_gp bigint not null
    check (reward_gp >= 50),

  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


comment on table public.achievement_reward_catalog is
  'Server-authoritative GP reward definitions for BOBU achievements.';

comment on column public.achievement_reward_catalog.reward_gp is
  'Trusted GP amount awarded after an achievement reward is claimed.';


drop trigger if exists achievement_reward_catalog_set_updated_at
  on public.achievement_reward_catalog;

create trigger achievement_reward_catalog_set_updated_at
before update on public.achievement_reward_catalog
for each row
execute function public.bobu_set_updated_at();


alter table public.achievement_reward_catalog
  enable row level security;


revoke all
on table public.achievement_reward_catalog
from public, anon, authenticated;


-- ============================================================
-- INITIAL SERVER ACHIEVEMENT CATALOG
-- ============================================================

insert into public.achievement_reward_catalog (
  achievement_id,
  reward_gp,
  enabled
)
values (
  'first-mining-session',
  100,
  true
)
on conflict (achievement_id)
do update
set
  reward_gp = excluded.reward_gp,
  enabled = excluded.enabled,
  updated_at = now();


-- ============================================================
-- CLAIM ACHIEVEMENT REWARD
--
-- Guarantees:
-- 1. Builder identity comes from auth.uid().
-- 2. GP amount comes only from the server catalog.
-- 3. Achievement must already be unlocked.
-- 4. Each achievement can reward a Builder only once.
-- 5. Ledger entry, GP update and claim state are atomic.
-- ============================================================

create or replace function public.claim_my_achievement_reward(
  p_achievement_id text
)
returns table (
  claimed_now boolean,
  achievement_id text,
  reward_gp bigint,
  total_gp bigint,
  ledger_id uuid,
  claimed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid;
  v_achievement_id text;
  v_reward_gp bigint;
  v_progress public.achievement_progress;
  v_awarded boolean;
  v_total_gp bigint;
  v_ledger_id uuid;
  v_claimed_at timestamptz;
begin
  v_builder_id := auth.uid();
  v_achievement_id :=
    trim(coalesce(p_achievement_id, ''));

  if v_builder_id is null then
    raise exception 'Authentication required.';
  end if;

  if v_achievement_id = '' then
    raise exception 'Achievement ID is required.';
  end if;

  select catalog.reward_gp
  into v_reward_gp
  from public.achievement_reward_catalog as catalog
  where catalog.achievement_id = v_achievement_id
    and catalog.enabled = true;

  if v_reward_gp is null then
    raise exception
      'Achievement reward is not available.';
  end if;

  select progress.*
  into v_progress
  from public.achievement_progress as progress
  where progress.builder_id = v_builder_id
    and progress.achievement_id = v_achievement_id
  for update;

  if not found then
    raise exception
      'Achievement progress was not found.';
  end if;

  if v_progress.status = 'claimed'
     or v_progress.claimed_at is not null then

    select profile.gp
    into v_total_gp
    from public.builder_profiles as profile
    where profile.builder_id = v_builder_id;

    return query
    select
      false,
      v_achievement_id,
      v_reward_gp,
      coalesce(v_total_gp, 0),
      null::uuid,
      v_progress.claimed_at;

    return;
  end if;

  if v_progress.status <> 'unlocked'
     or v_progress.unlocked_at is null then
    raise exception
      'Achievement must be unlocked before its reward can be claimed.';
  end if;

  select
    reward.awarded,
    reward.total_gp,
    reward.ledger_id
  into
    v_awarded,
    v_total_gp,
    v_ledger_id
  from public.award_builder_gp(
    v_builder_id,
    'achievement',
    v_reward_gp,
    concat(
      'achievement:',
      v_achievement_id
    ),
    null,
    jsonb_build_object(
      'achievement_id',
      v_achievement_id
    )
  ) as reward;

  v_claimed_at := now();

  update public.achievement_progress
  set
    status = 'claimed',
    claimed_at = v_claimed_at,
    version = version + 1,
    updated_at = now()
  where id = v_progress.id;

  return query
  select
    v_awarded,
    v_achievement_id,
    v_reward_gp,
    v_total_gp,
    v_ledger_id,
    v_claimed_at;
end;
$$;


revoke all
on function public.claim_my_achievement_reward(
  text
)
from public, anon;


grant execute
on function public.claim_my_achievement_reward(
  text
)
to authenticated;
