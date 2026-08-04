-- ============================================================
-- BOBU UNIVERSE
-- Push Device Registry v1
-- ============================================================
--
-- Stores Expo push tokens for authenticated Builders.
-- Clients cannot read or write the table directly.
-- Registration and disabling are performed through RPCs.
-- ============================================================

begin;

create table if not exists public.builder_push_devices (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  expo_push_token text not null,

  platform text not null
    check (platform in ('ios', 'android')),

  device_name text,

  app_variant text not null default 'development'
    check (
      app_variant in (
        'development',
        'preview',
        'production'
      )
    ),

  app_version text,

  enabled boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  last_registered_at timestamptz not null default now(),

  last_seen_at timestamptz not null default now(),

  disabled_at timestamptz,

  constraint builder_push_devices_token_not_blank
    check (length(trim(expo_push_token)) > 0),

  constraint builder_push_devices_token_length
    check (length(expo_push_token) <= 512),

  constraint builder_push_devices_device_name_length
    check (
      device_name is null
      or length(device_name) <= 160
    ),

  constraint builder_push_devices_app_version_length
    check (
      app_version is null
      or length(app_version) <= 64
    )
);

create unique index if not exists
  builder_push_devices_token_unique_idx
on public.builder_push_devices (
  expo_push_token
);

create index if not exists
  builder_push_devices_builder_enabled_idx
on public.builder_push_devices (
  builder_id,
  enabled
);

create index if not exists
  builder_push_devices_last_seen_idx
on public.builder_push_devices (
  last_seen_at desc
);

alter table public.builder_push_devices
enable row level security;

revoke all
on table public.builder_push_devices
from public, anon, authenticated;

comment on table public.builder_push_devices is
'Server-authoritative Expo push device registry for authenticated BOBU Builders.';


-- ============================================================
-- REGISTER OR REFRESH DEVICE
-- ============================================================

create or replace function public.register_my_push_device(
  p_expo_push_token text,
  p_platform text,
  p_device_name text default null,
  p_app_variant text default 'development',
  p_app_version text default null
)
returns table (
  device_id uuid,
  registered boolean,
  enabled boolean,
  registered_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_now timestamptz := now();
  v_token text := trim(coalesce(p_expo_push_token, ''));
  v_platform text := lower(trim(coalesce(p_platform, '')));
  v_variant text := lower(
    trim(coalesce(p_app_variant, 'development'))
  );
  v_device_name text := nullif(
    trim(coalesce(p_device_name, '')),
    ''
  );
  v_app_version text := nullif(
    trim(coalesce(p_app_version, '')),
    ''
  );
  v_device_id uuid;
begin
  if v_builder_id is null then
    raise exception 'Authentication is required';
  end if;

  if v_token = '' then
    raise exception 'Expo push token is required';
  end if;

  if length(v_token) > 512 then
    raise exception 'Expo push token is too long';
  end if;

  if v_token not like 'ExponentPushToken[%'
    and v_token not like 'ExpoPushToken[%'
  then
    raise exception 'Invalid Expo push token format';
  end if;

  if v_platform not in ('ios', 'android') then
    raise exception 'Unsupported device platform';
  end if;

  if v_variant not in (
    'development',
    'preview',
    'production'
  ) then
    raise exception 'Unsupported app variant';
  end if;

  if v_device_name is not null
    and length(v_device_name) > 160
  then
    raise exception 'Device name is too long';
  end if;

  if v_app_version is not null
    and length(v_app_version) > 64
  then
    raise exception 'App version is too long';
  end if;

  insert into public.builder_profiles (
    builder_id
  )
  values (
    v_builder_id
  )
  on conflict (builder_id) do nothing;

  insert into public.builder_push_devices (
    builder_id,
    expo_push_token,
    platform,
    device_name,
    app_variant,
    app_version,
    enabled,
    created_at,
    updated_at,
    last_registered_at,
    last_seen_at,
    disabled_at
  )
  values (
    v_builder_id,
    v_token,
    v_platform,
    v_device_name,
    v_variant,
    v_app_version,
    true,
    v_now,
    v_now,
    v_now,
    v_now,
    null
  )
  on conflict (expo_push_token)
  do update set
    builder_id = excluded.builder_id,
    platform = excluded.platform,
    device_name = excluded.device_name,
    app_variant = excluded.app_variant,
    app_version = excluded.app_version,
    enabled = true,
    updated_at = v_now,
    last_registered_at = v_now,
    last_seen_at = v_now,
    disabled_at = null
  returning id
  into v_device_id;

  return query
  select
    v_device_id,
    true,
    true,
    v_now;
end;
$$;

revoke all
on function public.register_my_push_device(
  text,
  text,
  text,
  text,
  text
)
from public, anon;

grant execute
on function public.register_my_push_device(
  text,
  text,
  text,
  text,
  text
)
to authenticated;

comment on function public.register_my_push_device(
  text,
  text,
  text,
  text,
  text
) is
'Registers or refreshes the authenticated Builder Expo push token without exposing the device registry table.';


-- ============================================================
-- DISABLE DEVICE
-- ============================================================

create or replace function public.disable_my_push_device(
  p_expo_push_token text
)
returns table (
  disabled boolean,
  disabled_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_now timestamptz := now();
  v_token text := trim(
    coalesce(p_expo_push_token, '')
  );
  v_updated_count integer := 0;
begin
  if v_builder_id is null then
    raise exception 'Authentication is required';
  end if;

  if v_token = '' then
    raise exception 'Expo push token is required';
  end if;

  update public.builder_push_devices
  set
    enabled = false,
    disabled_at = v_now,
    updated_at = v_now,
    last_seen_at = v_now
  where builder_id = v_builder_id
    and expo_push_token = v_token
    and enabled = true;

  get diagnostics
    v_updated_count = row_count;

  return query
  select
    v_updated_count > 0,
    case
      when v_updated_count > 0
        then v_now
      else null::timestamptz
    end;
end;
$$;

revoke all
on function public.disable_my_push_device(text)
from public, anon;

grant execute
on function public.disable_my_push_device(text)
to authenticated;

comment on function public.disable_my_push_device(text) is
'Disables the authenticated Builder matching Expo push token during logout or notification opt-out.';

commit;
