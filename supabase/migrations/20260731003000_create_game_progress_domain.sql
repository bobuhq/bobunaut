-- ============================================================
-- BOBU UNIVERSE
-- Game Progress Domain
--
-- Production persistence for:
--   1. Game profiles
--   2. Mission progress
--
-- Mission definitions remain in the application catalog for v1.
-- Browser clients may read only their own records.
-- Direct browser writes are not allowed.
-- ============================================================


-- ============================================================
-- GAME PROFILES
-- One canonical game profile per Builder.
-- This table contains only Game Domain progression.
-- GP and Builder progression remain in builder_profiles.
-- ============================================================

create table if not exists public.game_profiles (
  builder_id uuid primary key
    references public.builder_profiles(builder_id)
    on delete cascade,

  game_level integer not null default 1
    check (game_level >= 1),

  game_xp bigint not null default 0
    check (game_xp >= 0),

  season_id text
    check (
      season_id is null
      or char_length(trim(season_id)) between 1 and 100
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists game_profiles_level_idx
  on public.game_profiles(game_level desc);

create index if not exists game_profiles_xp_idx
  on public.game_profiles(game_xp desc);

create index if not exists game_profiles_season_idx
  on public.game_profiles(season_id)
  where season_id is not null;


comment on table public.game_profiles is
  'Canonical Game Domain profile containing Builder game progression.';

comment on column public.game_profiles.game_level is
  'Builder level inside the BOBU Game Domain.';

comment on column public.game_profiles.game_xp is
  'Builder experience accumulated inside the BOBU Game Domain.';

comment on column public.game_profiles.season_id is
  'Optional active season identifier for the Builder game profile.';


-- ============================================================
-- MISSION PROGRESS
-- Builder-specific mission progress.
--
-- Mission definitions, rewards and evaluation rules remain
-- server-authoritative and are not stored in this table.
--
-- cycle_key examples:
--   lifetime
--   2026-07-31
--   2026-W31
--   season-01
-- ============================================================

create table if not exists public.mission_progress (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  mission_id text not null
    check (
      char_length(trim(mission_id)) between 1 and 150
    ),

  cycle_key text not null default 'lifetime'
    check (
      char_length(trim(cycle_key)) between 1 and 150
    ),

  status text not null default 'available'
    check (
      char_length(trim(status)) between 1 and 50
    ),

  progress bigint not null default 0
    check (progress >= 0),

  version bigint not null default 1
    check (version >= 1),

  last_event_at timestamptz,
  completed_at timestamptz,
  claimed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint mission_progress_builder_mission_cycle_unique
    unique (builder_id, mission_id, cycle_key),

  constraint mission_progress_claim_requires_completion
    check (
      claimed_at is null
      or completed_at is not null
    )
);


create index if not exists mission_progress_builder_idx
  on public.mission_progress(builder_id);

create index if not exists mission_progress_builder_status_idx
  on public.mission_progress(builder_id, status);

create index if not exists mission_progress_mission_idx
  on public.mission_progress(mission_id);

create index if not exists mission_progress_cycle_idx
  on public.mission_progress(cycle_key);

create index if not exists mission_progress_completed_idx
  on public.mission_progress(builder_id, completed_at desc)
  where completed_at is not null;


comment on table public.mission_progress is
  'Server-authoritative Builder mission progress by mission and cycle.';

comment on column public.mission_progress.cycle_key is
  'Mission recurrence identity such as lifetime, daily date, week or season.';

comment on column public.mission_progress.version is
  'Monotonic version reserved for safe concurrent mission progress updates.';

comment on column public.mission_progress.last_event_at is
  'Timestamp of the most recent accepted event affecting this mission progress.';


-- ============================================================
-- UPDATED_AT
-- Reuse the existing shared BOBU trigger function.
-- ============================================================

drop trigger if exists game_profiles_set_updated_at
  on public.game_profiles;

create trigger game_profiles_set_updated_at
before update on public.game_profiles
for each row
execute function public.bobu_set_updated_at();


drop trigger if exists mission_progress_set_updated_at
  on public.mission_progress;

create trigger mission_progress_set_updated_at
before update on public.mission_progress
for each row
execute function public.bobu_set_updated_at();


-- ============================================================
-- EXISTING BUILDERS
-- Create a default game profile for every existing Builder.
-- ============================================================

insert into public.game_profiles (
  builder_id
)
select
  profile.builder_id
from public.builder_profiles as profile
on conflict (builder_id)
do nothing;


-- ============================================================
-- ROW LEVEL SECURITY
-- Builders may read only their own Game Domain records.
-- No direct browser INSERT, UPDATE or DELETE access is granted.
-- ============================================================

alter table public.game_profiles
  enable row level security;

alter table public.mission_progress
  enable row level security;


drop policy if exists
  "Builders can read their own game profile"
  on public.game_profiles;

create policy
  "Builders can read their own game profile"
on public.game_profiles
for select
to authenticated
using (
  auth.uid() = builder_id
);


drop policy if exists
  "Builders can read their own mission progress"
  on public.mission_progress;

create policy
  "Builders can read their own mission progress"
on public.mission_progress
for select
to authenticated
using (
  auth.uid() = builder_id
);


-- ============================================================
-- TABLE PRIVILEGES
-- Authenticated clients receive read-only access through RLS.
-- Future writes will be performed only by trusted RPC functions.
-- ============================================================

revoke all on table public.game_profiles
  from anon, authenticated;

revoke all on table public.mission_progress
  from anon, authenticated;

grant select on table public.game_profiles
  to authenticated;

grant select on table public.mission_progress
  to authenticated;
