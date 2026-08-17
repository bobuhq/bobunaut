begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Sector Core v1
--
-- ADD-ONLY.
-- Creates the Mars Sector domain.
-- Does not alter GP, Mining, Referral, Wallet or Colony history.
-- ============================================================

create table if not exists public.mars_sectors (
  id uuid primary key default gen_random_uuid(),

  sector_code text not null unique,
  name text not null unique,

  status text not null default 'active'
    check (
      status in (
        'active',
        'restricted',
        'locked',
        'archived'
      )
    ),

  max_colonies bigint not null default 100
    check (max_colonies > 0),

  current_colonies bigint not null default 0
    check (current_colonies >= 0),

  total_contribution bigint not null default 0
    check (total_contribution >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.mars_colony_sector_assignments (
  id uuid primary key default gen_random_uuid(),

  colony_id uuid not null
    references public.mars_colonies(id)
    on delete restrict,

  sector_id uuid not null
    references public.mars_sectors(id)
    on delete restrict,

  status text not null default 'active'
    check (
      status in (
        'active',
        'relocating',
        'left',
        'merged',
        'archived'
      )
    ),

  assigned_at timestamptz not null default now(),
  left_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create unique index if not exists
  mars_colony_one_active_sector_idx
on public.mars_colony_sector_assignments(colony_id)
where status = 'active';


create index if not exists
  mars_sector_active_colonies_idx
on public.mars_colony_sector_assignments(
  sector_id,
  status
);


alter table public.mars_sectors
enable row level security;

alter table public.mars_colony_sector_assignments
enable row level security;


insert into public.mars_sectors (
  sector_code,
  name,
  status,
  max_colonies
)
values
  ('ARES', 'Ares Sector', 'active', 100),
  ('ELYSIUM', 'Elysium Sector', 'active', 100),
  ('ARCADIA', 'Arcadia Sector', 'active', 100),
  ('UTOPIA', 'Utopia Sector', 'active', 100),
  ('HELLAS', 'Hellas Sector', 'active', 100),
  ('VALLES', 'Valles Sector', 'active', 100)
on conflict (sector_code) do nothing;


commit;
