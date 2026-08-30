begin;

alter table public.builder_mars_access
  add column if not exists unlock_method text,
  add column if not exists telegram_verified_at_unlock boolean,
  add column if not exists x_verified_at_unlock boolean,
  add column if not exists mining_days_at_unlock integer;

create or replace function public.get_my_ares_access_protocol()
returns table (
  builder_id uuid,
  telegram_verified boolean,
  x_verified boolean,
  mining_days integer,
  required_mining_days integer,
  unlocked boolean,
  unlocked_at timestamptz,
  unlock_method text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_telegram_verified boolean := false;
  v_x_verified boolean := false;
  v_mining_days integer := 0;
  v_required_mining_days integer := 7;
  v_eligible boolean := false;
  v_unlocked_at timestamptz;
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.builder_profiles bp
    where bp.builder_id = v_builder_id
  ) then
    raise exception 'BUILDER_PROFILE_REQUIRED'
      using errcode = '42501';
  end if;

  select
    coalesce(
      bool_or(
        lower(identity.provider) = 'telegram'
        and identity.verified = true
      ),
      false
    ),
    coalesce(
      bool_or(
        lower(identity.provider) = 'x'
        and identity.verified = true
      ),
      false
    )
  into
    v_telegram_verified,
    v_x_verified
  from public.builder_social_identities identity
  where identity.builder_id = v_builder_id;

  update public.builder_mining_sessions session
  set status = 'completed'
  where session.builder_id = v_builder_id
    and session.status = 'active'
    and session.ends_at <= now();

  select count(*)::integer
  into v_mining_days
  from public.builder_mining_sessions session
  where session.builder_id = v_builder_id
    and session.status in ('completed', 'claimed')
    and session.ends_at <= now()
    and session.ends_at - session.started_at >= interval '24 hours';

  v_eligible :=
    v_telegram_verified
    and v_x_verified
    and v_mining_days >= v_required_mining_days;

  if v_eligible then
    insert into public.builder_mars_access (
      builder_id,
      unlocked,
      unlocked_at,
      unlock_gp,
      unlock_method,
      telegram_verified_at_unlock,
      x_verified_at_unlock,
      mining_days_at_unlock,
      created_at,
      updated_at
    )
    values (
      v_builder_id,
      true,
      now(),
      null,
      'access_protocol_v2',
      true,
      true,
      v_mining_days,
      now(),
      now()
    )
    on conflict (builder_id)
    do update
    set
      unlocked = true,
      unlocked_at = coalesce(
        public.builder_mars_access.unlocked_at,
        excluded.unlocked_at
      ),
      unlock_gp = null,
      unlock_method = 'access_protocol_v2',
      telegram_verified_at_unlock = true,
      x_verified_at_unlock = true,
      mining_days_at_unlock = greatest(
        coalesce(
          public.builder_mars_access.mining_days_at_unlock,
          0
        ),
        excluded.mining_days_at_unlock
      ),
      updated_at = now();

    select access.unlocked_at
    into v_unlocked_at
    from public.builder_mars_access access
    where access.builder_id = v_builder_id;
  else
    insert into public.builder_mars_access (
      builder_id,
      unlocked,
      unlocked_at,
      unlock_gp,
      unlock_method,
      telegram_verified_at_unlock,
      x_verified_at_unlock,
      mining_days_at_unlock,
      created_at,
      updated_at
    )
    values (
      v_builder_id,
      false,
      null,
      null,
      'access_protocol_v2',
      v_telegram_verified,
      v_x_verified,
      v_mining_days,
      now(),
      now()
    )
    on conflict (builder_id)
    do update
    set
      unlocked = false,
      unlocked_at = null,
      unlock_gp = null,
      unlock_method = 'access_protocol_v2',
      telegram_verified_at_unlock = excluded.telegram_verified_at_unlock,
      x_verified_at_unlock = excluded.x_verified_at_unlock,
      mining_days_at_unlock = excluded.mining_days_at_unlock,
      updated_at = now();

    v_unlocked_at := null;
  end if;

  return query
  select
    v_builder_id,
    v_telegram_verified,
    v_x_verified,
    least(v_mining_days, v_required_mining_days),
    v_required_mining_days,
    v_eligible,
    v_unlocked_at,
    'access_protocol_v2'::text;
end;
$$;

create or replace function public.ensure_my_mars_access()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unlocked boolean;
begin
  select access.unlocked
  into v_unlocked
  from public.get_my_ares_access_protocol() access
  limit 1;

  return coalesce(v_unlocked, false);
end;
$$;

create or replace function public.assert_my_mars_access()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ensure_my_mars_access() then
    raise exception 'MARS_ACCESS_LOCKED'
      using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.get_my_ares_access_protocol()
from public, anon;

revoke all on function public.ensure_my_mars_access()
from public, anon;

revoke all on function public.assert_my_mars_access()
from public, anon;

grant execute on function public.get_my_ares_access_protocol()
to authenticated;

grant execute on function public.ensure_my_mars_access()
to authenticated;

grant execute on function public.assert_my_mars_access()
to authenticated;

comment on function public.get_my_ares_access_protocol() is
'Returns authoritative Ares Access Protocol eligibility. All Builders require verified Telegram, verified X, and seven completed 24-hour mining sessions.';

comment on function public.ensure_my_mars_access() is
'Evaluates current Ares Access Protocol requirements. Previous GP-based unlocks do not bypass protocol requirements.';

comment on function public.assert_my_mars_access() is
'Blocks Ares access unless all current Access Protocol requirements are satisfied.';

commit;
