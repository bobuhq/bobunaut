begin;

create table if not exists public.mars_pixel_network_config (
  id smallint primary key default 1
    check (id = 1),

  grid_width integer not null default 1000
    check (grid_width = 1000),

  grid_height integer not null default 1000
    check (grid_height = 1000),

  grid_version integer not null default 1
    check (grid_version > 0),

  commercial_status text not null default 'locked'
    check (
      commercial_status in (
        'locked',
        'preview',
        'active',
        'paused',
        'archived'
      )
    ),

  activated_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (commercial_status = 'active' and activated_at is not null)
    or commercial_status <> 'active'
  )
);

insert into public.mars_pixel_network_config (
  id,
  grid_width,
  grid_height,
  grid_version,
  commercial_status
)
values (
  1,
  1000,
  1000,
  1,
  'locked'
)
on conflict (id) do nothing;


create table if not exists public.mars_pixel_reserved_zones (
  id uuid primary key default gen_random_uuid(),

  zone_code text not null unique,
  zone_name text not null,

  reservation_type text not null
    check (
      reservation_type in (
        'system',
        'exploration',
        'protected'
      )
    ),

  x_start integer not null,
  y_start integer not null,
  width integer not null,
  height integer not null,

  permanent boolean not null default true,
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (x_start >= 0 and x_start < 1000),
  check (y_start >= 0 and y_start < 1000),
  check (width > 0),
  check (height > 0),
  check (x_start + width <= 1000),
  check (y_start + height <= 1000)
);


create table if not exists public.mars_advertisers (
  id uuid primary key default gen_random_uuid(),

  owner_builder_id uuid
    references auth.users(id)
    on delete restrict,

  display_name text not null,

  advertiser_type text not null
    check (
      advertiser_type in (
        'company',
        'business',
        'creator',
        'personal'
      )
    ),

  status text not null default 'under_review'
    check (
      status in (
        'under_review',
        'active',
        'suspended',
        'archived'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.mars_pixel_allocations (
  id uuid primary key default gen_random_uuid(),

  advertiser_id uuid
    references public.mars_advertisers(id)
    on delete restrict,

  allocation_status text not null
    check (
      allocation_status in (
        'owned',
        'released',
        'revoked'
      )
    ),

  x_start integer not null,
  y_start integer not null,
  width integer not null,
  height integer not null,

  grid_version integer not null default 1
    check (grid_version > 0),

  activated_at timestamptz,
  released_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (x_start >= 0 and x_start < 1000),
  check (y_start >= 0 and y_start < 1000),
  check (width > 0),
  check (height > 0),
  check (x_start + width <= 1000),
  check (y_start + height <= 1000),

  check (
    allocation_status <> 'owned'
    or advertiser_id is not null
  )
);


create table if not exists public.mars_ad_creatives (
  id uuid primary key default gen_random_uuid(),

  allocation_id uuid not null
    references public.mars_pixel_allocations(id)
    on delete restrict,

  title text not null,

  image_url text,

  destination_url text
    check (
      destination_url is null
      or (
        char_length(destination_url) <= 2048
        and destination_url ~* '^https://[^[:space:]]+$'
      )
    ),

  status text not null default 'under_review'
    check (
      status in (
        'under_review',
        'active',
        'suspended',
        'archived'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.mars_pixel_allocation_events (
  id uuid primary key default gen_random_uuid(),

  allocation_id uuid not null
    references public.mars_pixel_allocations(id)
    on delete restrict,

  event_type text not null
    check (
      event_type in (
        'created',
        'activated',
        'released',
        'revoked',
        'creative_changed'
      )
    ),

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  event_data jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);


create index if not exists
  mars_pixel_reserved_zones_active_idx
on public.mars_pixel_reserved_zones (
  active,
  zone_code
);


create index if not exists
  mars_advertisers_owner_idx
on public.mars_advertisers (
  owner_builder_id
);


create index if not exists
  mars_advertisers_status_idx
on public.mars_advertisers (
  status
);


create index if not exists
  mars_pixel_allocations_status_idx
on public.mars_pixel_allocations (
  allocation_status
);


create index if not exists
  mars_pixel_allocations_advertiser_idx
on public.mars_pixel_allocations (
  advertiser_id
);


create index if not exists
  mars_ad_creatives_allocation_idx
on public.mars_ad_creatives (
  allocation_id,
  status
);


create index if not exists
  mars_pixel_allocation_events_allocation_idx
on public.mars_pixel_allocation_events (
  allocation_id,
  created_at desc
);


alter table public.mars_pixel_network_config
enable row level security;

alter table public.mars_pixel_reserved_zones
enable row level security;

alter table public.mars_advertisers
enable row level security;

alter table public.mars_pixel_allocations
enable row level security;

alter table public.mars_ad_creatives
enable row level security;

alter table public.mars_pixel_allocation_events
enable row level security;


revoke all on table public.mars_pixel_network_config
from public, anon, authenticated;

revoke all on table public.mars_pixel_reserved_zones
from public, anon, authenticated;

revoke all on table public.mars_advertisers
from public, anon, authenticated;

revoke all on table public.mars_pixel_allocations
from public, anon, authenticated;

revoke all on table public.mars_ad_creatives
from public, anon, authenticated;

revoke all on table public.mars_pixel_allocation_events
from public, anon, authenticated;


create or replace function public.get_mars_pixel_network_status()
returns table (
  grid_width integer,
  grid_height integer,
  grid_version integer,
  commercial_status text,
  activated_at timestamptz,
  total_pixels bigint,
  reserved_pixels bigint,
  owned_pixels bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    config.grid_width,
    config.grid_height,
    config.grid_version,
    config.commercial_status,
    config.activated_at,
    (config.grid_width::bigint * config.grid_height::bigint)
      as total_pixels,
    coalesce((
      select sum(
        zone.width::bigint *
        zone.height::bigint
      )
      from public.mars_pixel_reserved_zones as zone
      where zone.active = true
    ), 0::bigint) as reserved_pixels,
    coalesce((
      select sum(
        allocation.width::bigint *
        allocation.height::bigint
      )
      from public.mars_pixel_allocations as allocation
      where allocation.allocation_status = 'owned'
    ), 0::bigint) as owned_pixels
  from public.mars_pixel_network_config as config
  where config.id = 1;
$$;


revoke all on function public.get_mars_pixel_network_status()
from public;

grant execute on function public.get_mars_pixel_network_status()
to anon, authenticated;


create or replace function public.get_mars_pixel_public_allocations()
returns table (
  allocation_id uuid,
  x_start integer,
  y_start integer,
  width integer,
  height integer,
  advertiser_name text,
  creative_title text,
  creative_image_url text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    allocation.id,
    allocation.x_start,
    allocation.y_start,
    allocation.width,
    allocation.height,
    advertiser.display_name,
    creative.title,
    creative.image_url
  from public.mars_pixel_allocations as allocation
  join public.mars_advertisers as advertiser
    on advertiser.id = allocation.advertiser_id
  left join lateral (
    select
      candidate.title,
      candidate.image_url
    from public.mars_ad_creatives as candidate
    where candidate.allocation_id = allocation.id
      and candidate.status = 'active'
    order by candidate.created_at desc
    limit 1
  ) as creative
    on true
  where allocation.allocation_status = 'owned'
    and advertiser.status = 'active'
    and exists (
      select 1
      from public.mars_pixel_network_config as config
      where config.id = 1
        and config.commercial_status in ('preview', 'active')
    );
$$;


revoke all on function public.get_mars_pixel_public_allocations()
from public;

grant execute on function public.get_mars_pixel_public_allocations()
to anon, authenticated;


comment on table public.mars_pixel_network_config is
'Authoritative Mars Pixel Network configuration. Commercial functionality remains server-side locked until explicitly activated.';

comment on table public.mars_pixel_reserved_zones is
'Permanent or protected Mars Pixel Network regions that cannot be commercially allocated.';

comment on table public.mars_pixel_allocations is
'Canonical logical Mars Pixel block allocation records. No direct client writes are permitted.';

comment on table public.mars_advertisers is
'Advertiser identity metadata separated from Mars Pixel ownership and creative content.';

comment on table public.mars_ad_creatives is
'Moderated public creative metadata associated with Mars Pixel allocations.';

comment on table public.mars_pixel_allocation_events is
'Immutable audit-oriented event history for Mars Pixel allocation lifecycle changes.';

commit;
