begin;

create table if not exists public.mars_discovery_catalog (
  discovery_key text primary key
    check (
      char_length(trim(discovery_key))
      between 1 and 100
    ),

  sector_key text not null
    check (
      char_length(trim(sector_key))
      between 1 and 50
    ),

  title text not null
    check (
      char_length(trim(title))
      between 1 and 150
    ),

  discovery_type text not null
    check (
      discovery_type in (
        'signal',
        'geological',
        'artifact',
        'data',
        'anomaly'
      )
    ),

  reward_gp bigint not null
    check (reward_gp >= 50),

  is_daily boolean not null default true,

  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.builder_mars_discoveries (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  discovery_key text not null
    references public.mars_discovery_catalog(discovery_key),

  sector_key text not null,

  cycle_key text not null,

  reward_gp bigint not null
    check (reward_gp >= 50),

  ledger_id uuid
    references public.builder_reward_ledger(id),

  discovered_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),

  constraint builder_mars_discoveries_cycle_unique
    unique (
      builder_id,
      discovery_key,
      cycle_key
    )
);

create index if not exists
  builder_mars_discoveries_builder_idx
on public.builder_mars_discoveries(
  builder_id,
  discovered_at desc
);

create index if not exists
  builder_mars_discoveries_cycle_idx
on public.builder_mars_discoveries(
  cycle_key
);

alter table public.mars_discovery_catalog
  enable row level security;

alter table public.builder_mars_discoveries
  enable row level security;

revoke all
on table public.mars_discovery_catalog
from public, anon, authenticated;

revoke insert, update, delete
on table public.builder_mars_discoveries
from public, anon, authenticated;

grant select
on table public.builder_mars_discoveries
to authenticated;

drop policy if exists
  "Builders can read their own Mars discoveries"
on public.builder_mars_discoveries;

create policy
  "Builders can read their own Mars discoveries"
on public.builder_mars_discoveries
for select
to authenticated
using (
  builder_id = auth.uid()
);

insert into public.mars_discovery_catalog (
  discovery_key,
  sector_key,
  title,
  discovery_type,
  reward_gp,
  is_daily,
  enabled
)
values (
  'ares-signal-01',
  'ares',
  'Ares Signal 01',
  'signal',
  100,
  true,
  true
)
on conflict (discovery_key)
do update set
  sector_key = excluded.sector_key,
  title = excluded.title,
  discovery_type = excluded.discovery_type,
  reward_gp = excluded.reward_gp,
  is_daily = excluded.is_daily,
  enabled = excluded.enabled,
  updated_at = now();

create or replace function public.complete_my_ares_daily_discovery(
  p_discovery_key text
)
returns table (
  completed_now boolean,
  discovery_key text,
  cycle_key text,
  reward_gp bigint,
  total_gp bigint,
  ledger_id uuid,
  discovered_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid;
  v_discovery_key text;
  v_cycle_key text;
  v_sector_key text;
  v_reward_gp bigint;
  v_existing public.builder_mars_discoveries%rowtype;
  v_awarded boolean;
  v_total_gp bigint;
  v_ledger_id uuid;
  v_discovered_at timestamptz;
begin
  v_builder_id := auth.uid();

  if v_builder_id is null then
    raise exception 'Authentication required.';
  end if;

  perform public.assert_my_mars_access();

  v_discovery_key :=
    trim(coalesce(p_discovery_key, ''));

  if v_discovery_key = '' then
    raise exception 'Discovery key is required.';
  end if;

  select
    catalog.sector_key,
    catalog.reward_gp
  into
    v_sector_key,
    v_reward_gp
  from public.mars_discovery_catalog as catalog
  where catalog.discovery_key =
      v_discovery_key
    and catalog.enabled = true
    and catalog.is_daily = true
    and catalog.sector_key = 'ares';

  if not found then
    raise exception
      'Ares discovery is not available.';
  end if;

  v_cycle_key :=
    to_char(
      timezone('UTC', now()),
      'YYYY-MM-DD'
    );

  select discovery.*
  into v_existing
  from public.builder_mars_discoveries
    as discovery
  where discovery.builder_id =
      v_builder_id
    and discovery.discovery_key =
      v_discovery_key
    and discovery.cycle_key =
      v_cycle_key
  limit 1;

  if found then
    select profile.gp
    into v_total_gp
    from public.builder_profiles as profile
    where profile.builder_id =
      v_builder_id;

    return query
    select
      false,
      v_discovery_key,
      v_cycle_key,
      v_existing.reward_gp,
      coalesce(v_total_gp, 0),
      v_existing.ledger_id,
      v_existing.discovered_at;

    return;
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
    'mars_discovery',
    v_reward_gp,
    concat(
      'mars-discovery:',
      v_discovery_key,
      ':',
      v_cycle_key
    ),
    'mars',
    jsonb_build_object(
      'sector',
      v_sector_key,
      'discovery_key',
      v_discovery_key,
      'cycle_key',
      v_cycle_key,
      'type',
      'daily_exploration'
    )
  ) as reward;

  if not v_awarded then
    raise exception
      'Discovery reward could not be issued.';
  end if;

  v_discovered_at := now();

  insert into public.builder_mars_discoveries (
    builder_id,
    discovery_key,
    sector_key,
    cycle_key,
    reward_gp,
    ledger_id,
    discovered_at,
    metadata
  )
  values (
    v_builder_id,
    v_discovery_key,
    v_sector_key,
    v_cycle_key,
    v_reward_gp,
    v_ledger_id,
    v_discovered_at,
    jsonb_build_object(
      'source',
      'ares_exploration',
      'completion',
      'scan'
    )
  );

  return query
  select
    true,
    v_discovery_key,
    v_cycle_key,
    v_reward_gp,
    v_total_gp,
    v_ledger_id,
    v_discovered_at;
end;
$$;

revoke all
on function public.complete_my_ares_daily_discovery(
  text
)
from public, anon;

grant execute
on function public.complete_my_ares_daily_discovery(
  text
)
to authenticated;

comment on table public.mars_discovery_catalog is
  'Server-authoritative Mars discovery definitions.';

comment on table public.builder_mars_discoveries is
  'Immutable Builder Mars discovery completion history.';

comment on function public.complete_my_ares_daily_discovery(
  text
) is
  'Completes an authenticated Builder daily Ares discovery and awards server-authoritative GP once per UTC cycle.';

commit;
