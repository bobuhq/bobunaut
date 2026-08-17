begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Colony Core v1
--
-- ADD-ONLY.
-- Does not alter GP, Mining, Mission, Referral, Wallet,
-- Identity or existing Mars Core tables.
-- ============================================================

create table if not exists public.mars_colonies (
  id uuid primary key default gen_random_uuid(),

  colony_code text not null unique,
  name text not null unique,

  founder_builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete restrict,

  leader_builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete restrict,

  specialization text not null default 'general'
    check (
      specialization in (
        'general',
        'mining',
        'exploration',
        'science',
        'architecture',
        'guardian',
        'command'
      )
    ),

  status text not null default 'active'
    check (
      status in (
        'active',
        'restricted',
        'suspended',
        'inactive',
        'archived',
        'merged'
      )
    ),

  member_count bigint not null default 1
    check (member_count >= 0),

  total_contribution bigint not null default 0
    check (total_contribution >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mars_colony_memberships (
  id uuid primary key default gen_random_uuid(),

  colony_id uuid not null
    references public.mars_colonies(id)
    on delete restrict,

  builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete restrict,

  role text not null default 'member'
    check (
      role in (
        'founder',
        'leader',
        'officer',
        'member'
      )
    ),

  status text not null default 'active'
    check (
      status in (
        'invited',
        'requested',
        'active',
        'leaving',
        'left',
        'removed',
        'suspended',
        'merged'
      )
    ),

  joined_at timestamptz,
  left_at timestamptz,

  invited_by_builder_id uuid
    references public.builder_profiles(builder_id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A Builder may have only one active Colony membership.
create unique index if not exists
  mars_colony_memberships_one_active_colony_per_builder
on public.mars_colony_memberships(builder_id)
where status = 'active';

create index if not exists
  mars_colony_memberships_colony_active_idx
on public.mars_colony_memberships(colony_id, status);

create index if not exists
  mars_colonies_status_idx
on public.mars_colonies(status, created_at desc);

create table if not exists public.mars_colony_history (
  id uuid primary key default gen_random_uuid(),

  colony_id uuid not null
    references public.mars_colonies(id)
    on delete restrict,

  event_type text not null,

  event_key text not null,

  actor_builder_id uuid
    references public.builder_profiles(builder_id)
    on delete set null,

  subject_builder_id uuid
    references public.builder_profiles(builder_id)
    on delete set null,

  title text not null,
  description text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (colony_id, event_type, event_key)
);

create index if not exists
  mars_colony_history_colony_created_idx
on public.mars_colony_history(colony_id, created_at desc);

alter table public.mars_colonies enable row level security;
alter table public.mars_colony_memberships enable row level security;
alter table public.mars_colony_history enable row level security;

-- v1 security rule:
-- no direct client writes.
-- Authorized RPCs will be added in a separate migration after
-- local validation.

commit;
