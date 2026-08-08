-- ============================================================
-- BOBU UNIVERSE
-- Mobile Attestation Challenge Engine v1
--
-- Issues short-lived, one-time challenges for authenticated
-- Builders. Challenges are consumed only by trusted backend
-- verification code.
-- ============================================================

begin;

create table if not exists public.mobile_attestation_challenges (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  challenge text not null,

  platform text not null
    check (platform in ('ios', 'android')),

  purpose text not null
    default 'mobile_pioneer'
    check (purpose in ('mobile_pioneer')),

  created_at timestamptz not null default now(),

  expires_at timestamptz not null,

  consumed_at timestamptz,

  constraint mobile_attestation_challenge_not_blank
    check (length(trim(challenge)) >= 32)
);

create unique index if not exists
  mobile_attestation_challenges_challenge_unique_idx
on public.mobile_attestation_challenges(challenge);

create index if not exists
  mobile_attestation_challenges_builder_idx
on public.mobile_attestation_challenges(
  builder_id,
  created_at desc
);

create index if not exists
  mobile_attestation_challenges_expiry_idx
on public.mobile_attestation_challenges(
  expires_at
);

alter table public.mobile_attestation_challenges
enable row level security;

revoke all
on table public.mobile_attestation_challenges
from public, anon, authenticated;


-- ============================================================
-- ISSUE CHALLENGE
-- ============================================================

create or replace function
public.create_my_mobile_attestation_challenge(
  p_platform text
)
returns table (
  challenge_id uuid,
  challenge text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_platform text :=
    lower(trim(coalesce(p_platform, '')));
  v_challenge text;
  v_id uuid;
  v_expires_at timestamptz :=
    now() + interval '5 minutes';
begin
  if v_builder_id is null then
    raise exception 'Authentication is required';
  end if;

  if v_platform not in ('ios', 'android') then
    raise exception 'Unsupported platform';
  end if;

  insert into public.builder_profiles(builder_id)
  values (v_builder_id)
  on conflict (builder_id) do nothing;

  /*
   * 32 random bytes -> 64 hex chars.
   */
  v_challenge :=
    encode(gen_random_bytes(32), 'hex');

  insert into public.mobile_attestation_challenges (
    builder_id,
    challenge,
    platform,
    purpose,
    expires_at
  )
  values (
    v_builder_id,
    v_challenge,
    v_platform,
    'mobile_pioneer',
    v_expires_at
  )
  returning id into v_id;

  return query
  select
    v_id,
    v_challenge,
    v_expires_at;
end;
$$;

revoke all
on function
public.create_my_mobile_attestation_challenge(text)
from public, anon, authenticated;

grant execute
on function
public.create_my_mobile_attestation_challenge(text)
to authenticated;


-- ============================================================
-- TRUSTED CONSUME
--
-- Edge Function/service role calls this only AFTER platform
-- attestation verification succeeds.
-- ============================================================

create or replace function
public.consume_mobile_attestation_challenge(
  p_challenge_id uuid,
  p_builder_id uuid,
  p_platform text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if p_challenge_id is null
     or p_builder_id is null then
    return false;
  end if;

  update public.mobile_attestation_challenges
  set consumed_at = now()
  where id = p_challenge_id
    and builder_id = p_builder_id
    and platform =
      lower(trim(coalesce(p_platform, '')))
    and purpose = 'mobile_pioneer'
    and consumed_at is null
    and expires_at > now();

  get diagnostics v_updated = row_count;

  return v_updated = 1;
end;
$$;

revoke all
on function
public.consume_mobile_attestation_challenge(
  uuid,
  uuid,
  text
)
from public, anon, authenticated;

grant execute
on function
public.consume_mobile_attestation_challenge(
  uuid,
  uuid,
  text
)
to service_role;


comment on table
public.mobile_attestation_challenges is
  'Short-lived one-time challenges used by BOBU native app attestation flows.';

commit;
