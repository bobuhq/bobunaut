begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Mars Core v1
--
-- Add-only migration.
-- Does not alter existing Builder, GP, Mining, Mission,
-- Referral, Wallet, Identity or Security systems.
-- ============================================================

create table if not exists public.mars_civilization_state (
  id uuid primary key default gen_random_uuid(),

  civilization_key text not null unique
    check (char_length(trim(civilization_key)) between 1 and 100),

  title text not null
    check (char_length(trim(title)) between 1 and 160),

  status text not null default 'active'
    check (
      status in (
        'draft',
        'active',
        'paused',
        'completed',
        'archived'
      )
    ),

  target_builder_count bigint not null default 1000000
    check (target_builder_count > 0),

  energy bigint not null default 0
    check (energy >= 0),

  water bigint not null default 0
    check (water >= 0),

  habitats bigint not null default 0
    check (habitats >= 0),

  science bigint not null default 0
    check (science >= 0),

  exploration bigint not null default 0
    check (exploration >= 0),

  security bigint not null default 0
    check (security >= 0),

  total_contribution bigint not null default 0
    check (total_contribution >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mars_contribution_ledger (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete restrict,

  source_type text not null
    check (
      source_type in (
        'mining',
        'mission',
        'profession',
        'colony',
        'sector',
        'story',
        'event',
        'discovery',
        'system'
      )
    ),

  source_reference_id text not null,

  contribution_type text not null
    check (
      contribution_type in (
        'energy',
        'water',
        'habitats',
        'science',
        'exploration',
        'security',
        'general'
      )
    ),

  amount bigint not null
    check (amount > 0),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (
    builder_id,
    source_type,
    source_reference_id,
    contribution_type
  )
);

create table if not exists public.mars_unlock_definitions (
  id uuid primary key default gen_random_uuid(),

  unlock_key text not null unique,

  title text not null,

  description text,

  status text not null default 'locked'
    check (
      status in (
        'hidden',
        'locked',
        'unlocking',
        'unlocked',
        'archived'
      )
    ),

  required_builder_count bigint not null default 0
    check (required_builder_count >= 0),

  required_total_contribution bigint not null default 0
    check (required_total_contribution >= 0),

  required_energy bigint not null default 0
    check (required_energy >= 0),

  required_water bigint not null default 0
    check (required_water >= 0),

  required_habitats bigint not null default 0
    check (required_habitats >= 0),

  required_science bigint not null default 0
    check (required_science >= 0),

  required_exploration bigint not null default 0
    check (required_exploration >= 0),

  required_security bigint not null default 0
    check (required_security >= 0),

  sort_order integer not null default 0,

  unlocked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mars_civilization_history (
  id uuid primary key default gen_random_uuid(),

  event_type text not null,

  event_key text not null,

  builder_id uuid
    references public.builder_profiles(builder_id)
    on delete set null,

  title text not null,

  description text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (event_type, event_key)
);

create index if not exists idx_mars_contribution_builder
  on public.mars_contribution_ledger(builder_id, created_at desc);

create index if not exists idx_mars_contribution_type
  on public.mars_contribution_ledger(contribution_type, created_at desc);

create index if not exists idx_mars_history_created
  on public.mars_civilization_history(created_at desc);

alter table public.mars_civilization_state enable row level security;
alter table public.mars_contribution_ledger enable row level security;
alter table public.mars_unlock_definitions enable row level security;
alter table public.mars_civilization_history enable row level security;

-- No direct client writes in v1.
-- Read policies / authorized RPCs will be added separately.

insert into public.mars_civilization_state (
  civilization_key,
  title,
  target_builder_count
)
values (
  'build_mars',
  'BUILD MARS',
  1000000
)
on conflict (civilization_key) do nothing;

insert into public.mars_unlock_definitions (
  unlock_key,
  title,
  description,
  status,
  required_builder_count,
  sort_order
)
values
  (
    'genesis_landing',
    'Genesis Landing',
    'The first active foothold of the BOBU civilization on Mars.',
    'unlocked',
    0,
    10
  ),
  (
    'first_habitat',
    'First Habitat',
    'The first permanent Builder habitat on Mars.',
    'locked',
    100,
    20
  ),
  (
    'energy_grid',
    'Energy Grid',
    'The first planetary-scale energy infrastructure.',
    'locked',
    250,
    30
  ),
  (
    'mars_civilization',
    'Mars Civilization',
    'The one-million-Builder civilization milestone.',
    'locked',
    1000000,
    1000
  )
on conflict (unlock_key) do nothing;


-- ============================================================
-- Initialize immutable Mars history.
-- ============================================================

update public.mars_unlock_definitions
set unlocked_at = coalesce(unlocked_at, now())
where unlock_key = 'genesis_landing'
  and status = 'unlocked';

insert into public.mars_civilization_history (
  event_type,
  event_key,
  title,
  description,
  metadata
)
values (
  'civilization_initialized',
  'build_mars_v1',
  'BUILD MARS Initialized',
  'The BUILD MARS civilization layer was initialized.',
  jsonb_build_object(
    'civilization_key', 'build_mars',
    'target_builders', 1000000
  )
)
on conflict (event_type, event_key) do nothing;


-- ============================================================
-- Shared Web + Mobile read model.
--
-- IMPORTANT:
-- - Read-only.
-- - Does not expose Builder records.
-- - Does not mutate GP, Mining, Missions or referrals.
-- - Current Builder population follows the existing
--   public Universe statistic definition: builder_profiles count.
-- ============================================================

create or replace function public.get_mars_civilization_overview()
returns table (
  civilization_key text,
  title text,
  status text,

  builders_joined bigint,
  target_builder_count bigint,

  total_contribution bigint,

  energy bigint,
  water bigint,
  habitats bigint,
  science bigint,
  exploration bigint,
  security bigint,

  next_unlock_key text,
  next_unlock_title text,
  next_unlock_status text,
  next_unlock_required_builders bigint,
  next_unlock_required_contribution bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.civilization_key,
    c.title,
    c.status,

    (
      select count(*)
      from public.builder_profiles
    )::bigint as builders_joined,

    c.target_builder_count,

    c.total_contribution,

    c.energy,
    c.water,
    c.habitats,
    c.science,
    c.exploration,
    c.security,

    u.unlock_key,
    u.title,
    u.status,
    u.required_builder_count,
    u.required_total_contribution

  from public.mars_civilization_state c

  left join lateral (
    select
      d.unlock_key,
      d.title,
      d.status,
      d.required_builder_count,
      d.required_total_contribution,
      d.sort_order
    from public.mars_unlock_definitions d
    where d.status in ('locked', 'unlocking')
    order by d.sort_order asc, d.created_at asc
    limit 1
  ) u on true

  where c.civilization_key = 'build_mars'
  limit 1;
$$;

revoke all
on function public.get_mars_civilization_overview()
from public;

grant execute
on function public.get_mars_civilization_overview()
to anon, authenticated;

comment on function public.get_mars_civilization_overview() is
'Returns the aggregate BUILD MARS civilization state for Web and Mobile without exposing Builder profile records.';

commit;
