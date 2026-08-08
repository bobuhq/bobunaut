-- ============================================================
-- BOBU UNIVERSE
-- Mobile Attested Key Registry v1
--
-- Stores server-verified native attestation keys.
-- Clients have zero direct access.
-- ============================================================

begin;

create table if not exists public.mobile_attested_keys (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  platform text not null
    check (platform in ('ios', 'android')),

  key_id text not null,

  public_key_pem text,

  receipt text,

  environment text not null
    check (environment in ('development', 'production')),

  assertion_counter bigint not null default 0
    check (assertion_counter >= 0),

  verified_at timestamptz not null default now(),

  last_asserted_at timestamptz,

  revoked_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  constraint mobile_attested_keys_key_id_not_blank
    check (length(trim(key_id)) > 0)
);

create unique index if not exists
  mobile_attested_keys_platform_key_unique_idx
on public.mobile_attested_keys (
  platform,
  key_id
);

create index if not exists
  mobile_attested_keys_builder_idx
on public.mobile_attested_keys (
  builder_id,
  platform,
  verified_at desc
);

alter table public.mobile_attested_keys
enable row level security;

revoke all
on table public.mobile_attested_keys
from public, anon, authenticated;


-- ============================================================
-- TRUSTED ATTESTED KEY REGISTRATION
-- ============================================================

create or replace function
public.register_verified_mobile_attested_key(
  p_builder_id uuid,
  p_platform text,
  p_key_id text,
  p_public_key_pem text,
  p_receipt text,
  p_environment text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_platform text :=
    lower(trim(coalesce(p_platform, '')));
  v_environment text :=
    lower(trim(coalesce(p_environment, '')));
begin
  if p_builder_id is null then
    raise exception 'Builder ID is required';
  end if;

  if v_platform not in ('ios', 'android') then
    raise exception 'Unsupported platform';
  end if;

  if v_environment not in (
    'development',
    'production'
  ) then
    raise exception 'Unsupported environment';
  end if;

  if trim(coalesce(p_key_id, '')) = '' then
    raise exception 'Key ID is required';
  end if;

  if p_metadata is null
     or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'Metadata must be a JSON object';
  end if;

  /*
   * A verified key may never silently move
   * between Builder accounts.
   */
  if exists (
    select 1
    from public.mobile_attested_keys as key
    where key.platform = v_platform
      and key.key_id = trim(p_key_id)
      and key.builder_id <> p_builder_id
  ) then
    raise exception
      'Attested key is already associated with another Builder';
  end if;

  insert into public.mobile_attested_keys (
    builder_id,
    platform,
    key_id,
    public_key_pem,
    receipt,
    environment,
    assertion_counter,
    verified_at,
    revoked_at,
    metadata
  )
  values (
    p_builder_id,
    v_platform,
    trim(p_key_id),
    nullif(trim(coalesce(p_public_key_pem, '')), ''),
    nullif(trim(coalesce(p_receipt, '')), ''),
    v_environment,
    0,
    now(),
    null,
    p_metadata
  )
  on conflict (platform, key_id)
  do update set
    public_key_pem =
      excluded.public_key_pem,
    receipt =
      excluded.receipt,
    environment =
      excluded.environment,
    verified_at =
      excluded.verified_at,
    revoked_at =
      null,
    metadata =
      excluded.metadata
  where
    public.mobile_attested_keys.builder_id =
      excluded.builder_id
  returning id into v_id;

  if v_id is null then
    raise exception
      'Attested key registration failed';
  end if;

  return v_id;
end;
$$;

revoke all
on function
public.register_verified_mobile_attested_key(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
)
from public, anon, authenticated;

grant execute
on function
public.register_verified_mobile_attested_key(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
)
to service_role;


-- ============================================================
-- ASSERTION COUNTER UPDATE
-- ============================================================

create or replace function
public.advance_mobile_attestation_counter(
  p_builder_id uuid,
  p_platform text,
  p_key_id text,
  p_counter bigint
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if p_counter is null or p_counter <= 0 then
    return false;
  end if;

  update public.mobile_attested_keys
  set
    assertion_counter = p_counter,
    last_asserted_at = now()
  where builder_id = p_builder_id
    and platform =
      lower(trim(coalesce(p_platform, '')))
    and key_id =
      trim(coalesce(p_key_id, ''))
    and revoked_at is null
    and assertion_counter < p_counter;

  get diagnostics v_updated = row_count;

  return v_updated = 1;
end;
$$;

revoke all
on function
public.advance_mobile_attestation_counter(
  uuid,
  text,
  text,
  bigint
)
from public, anon, authenticated;

grant execute
on function
public.advance_mobile_attestation_counter(
  uuid,
  text,
  text,
  bigint
)
to service_role;

comment on table public.mobile_attested_keys is
  'Server-verified native app attestation keys and monotonic assertion counters.';

commit;
