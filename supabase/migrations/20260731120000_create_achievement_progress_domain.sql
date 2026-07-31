-- ============================================================
-- BOBU UNIVERSE
-- Achievement Progress Domain
-- ============================================================

create table if not exists public.achievement_progress (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  achievement_id text not null
    check (
      char_length(trim(achievement_id))
      between 1 and 150
    ),

  status text not null default 'locked'
    check (
      char_length(trim(status))
      between 1 and 50
    ),

  progress bigint not null default 0
    check (progress >= 0),

  version bigint not null default 1
    check (version >= 1),

  last_event_at timestamptz,
  unlocked_at timestamptz,
  claimed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint achievement_progress_builder_unique
    unique (
      builder_id,
      achievement_id
    ),

  constraint achievement_progress_claim_requires_unlock
    check (
      claimed_at is null
      or unlocked_at is not null
    )
);

create index if not exists achievement_progress_builder_idx
  on public.achievement_progress(builder_id);

create index if not exists achievement_progress_status_idx
  on public.achievement_progress(builder_id, status);

create index if not exists achievement_progress_achievement_idx
  on public.achievement_progress(achievement_id);

create index if not exists achievement_progress_unlocked_idx
  on public.achievement_progress(builder_id, unlocked_at desc)
  where unlocked_at is not null;

comment on table public.achievement_progress is
  'Server-authoritative Builder achievement progress.';

comment on column public.achievement_progress.version is
  'Monotonic version for concurrent-safe achievement updates.';

comment on column public.achievement_progress.last_event_at is
  'Timestamp of the latest accepted event.';

drop trigger if exists achievement_progress_set_updated_at
  on public.achievement_progress;

create trigger achievement_progress_set_updated_at
before update on public.achievement_progress
for each row
execute function public.bobu_set_updated_at();

alter table public.achievement_progress
  enable row level security;

drop policy if exists
  "Builders can read their own achievement progress"
  on public.achievement_progress;

create policy
  "Builders can read their own achievement progress"
on public.achievement_progress
for select
to authenticated
using (
  auth.uid() = builder_id
);

revoke all
on table public.achievement_progress
from anon, authenticated;

grant select
on table public.achievement_progress
to authenticated;
