-- BOBU X Follow Verification V2
-- Schema preparation only.
-- No GP mutations, no legacy data migration.

begin;

create table public.builder_x_follow_state_v2 (
  builder_id uuid primary key
    references auth.users(id) on delete cascade,

  x_user_id text not null unique
    check (length(trim(x_user_id)) > 0),

  follow_status text not null default 'unknown'
    check (follow_status in (
      'unknown',
      'following',
      'not_following'
    )),

  last_checked_at timestamptz,
  next_check_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint x_follow_check_schedule_valid
    check (
      next_check_at is null
      or last_checked_at is null
      or next_check_at >= last_checked_at
    )
);

create index builder_x_follow_state_v2_due_idx
  on public.builder_x_follow_state_v2(next_check_at)
  where next_check_at is not null;

-- Allow composite foreign keys to enforce Builder ownership.
alter table public.builder_reward_ledger
  add constraint builder_reward_ledger_id_builder_unique
  unique (id, builder_id);

create table public.builder_x_reward_cycles_v2 (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references auth.users(id) on delete cascade,

  cycle_number integer not null
    check (cycle_number >= 1),

  status text not null
    check (status in (
      'active',
      'revoked',
      'reversal_pending'
    )),

  awarded_gp bigint not null default 5000
    check (awarded_gp = 5000),

  award_ledger_id uuid unique,

  reversal_ledger_id uuid unique,

  created_at timestamptz not null default now(),
  revoked_at timestamptz,

  unique (builder_id, cycle_number),

  constraint x_cycle_award_builder_fk
    foreign key (award_ledger_id, builder_id)
    references public.builder_reward_ledger(id, builder_id),

  constraint x_cycle_reversal_builder_fk
    foreign key (reversal_ledger_id, builder_id)
    references public.builder_reward_ledger(id, builder_id),

  constraint x_reward_cycle_ledger_distinct
    check (
      award_ledger_id is null
      or reversal_ledger_id is null
      or award_ledger_id <> reversal_ledger_id
    )
);

create unique index builder_x_reward_cycles_v2_active_idx
  on public.builder_x_reward_cycles_v2(builder_id)
  where status in ('active', 'reversal_pending');

alter table public.builder_x_follow_state_v2
  enable row level security;

alter table public.builder_x_reward_cycles_v2
  enable row level security;

revoke all on public.builder_x_follow_state_v2
  from public, anon, authenticated;

revoke all on public.builder_x_reward_cycles_v2
  from public, anon, authenticated;

grant select, insert, update, delete
  on public.builder_x_follow_state_v2
  to service_role;

grant select, insert, update, delete
  on public.builder_x_reward_cycles_v2
  to service_role;

commit;
