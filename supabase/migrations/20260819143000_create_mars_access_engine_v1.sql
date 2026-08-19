begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Access Engine v1
--
-- Mars unlock threshold: 20,000 authoritative Total GP.
--
-- Unlock is permanent once earned.
-- GP spending after unlock does not revoke Mars access.
--
-- No GP awards.
-- No Mining / Referral / Wallet mutations.
-- ============================================================


-- ------------------------------------------------------------
-- Persistent unlock state
-- ------------------------------------------------------------

create table if not exists public.builder_mars_access (
  builder_id uuid primary key
    references public.builder_profiles(builder_id)
    on delete cascade,

  unlocked boolean not null default false,

  unlocked_at timestamptz,

  unlock_gp bigint,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint builder_mars_access_unlock_gp_nonnegative
    check (unlock_gp is null or unlock_gp >= 0),

  constraint builder_mars_access_unlock_state_valid
    check (
      (unlocked = false and unlocked_at is null)
      or
      (unlocked = true and unlocked_at is not null)
    )
);


alter table public.builder_mars_access
  enable row level security;


drop policy if exists
  "Builders can read their own Mars access"
on public.builder_mars_access;


create policy
  "Builders can read their own Mars access"
on public.builder_mars_access
for select
to authenticated
using (builder_id = auth.uid());


revoke all
on table public.builder_mars_access
from public, anon, authenticated;

grant select
on table public.builder_mars_access
to authenticated;


-- ------------------------------------------------------------
-- Mars threshold
--
-- Single authoritative function so the threshold is not
-- duplicated throughout RPCs / frontend.
-- ------------------------------------------------------------

create or replace function public.get_mars_unlock_threshold()
returns bigint
language sql
immutable
security definer
set search_path = public, pg_temp
as $$
  select 20000::bigint;
$$;


revoke all
on function public.get_mars_unlock_threshold()
from public, anon, authenticated;

grant execute
on function public.get_mars_unlock_threshold()
to authenticated;


-- ------------------------------------------------------------
-- Internal access evaluator
--
-- builder_profiles.gp is the authoritative Total GP.
-- Pending Network GP is therefore not separately added here.
--
-- If GP reaches threshold, permanent unlock is recorded.
-- ------------------------------------------------------------

create or replace function public.ensure_my_mars_access()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_gp bigint;
  v_threshold bigint :=
    public.get_mars_unlock_threshold();
  v_unlocked boolean := false;
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  select coalesce(bp.gp, 0)
  into v_gp
  from public.builder_profiles bp
  where bp.builder_id = v_builder_id;

  if not found then
    raise exception 'BUILDER_PROFILE_REQUIRED'
      using errcode = '42501';
  end if;

  select coalesce(access.unlocked, false)
  into v_unlocked
  from public.builder_mars_access access
  where access.builder_id = v_builder_id;

  if coalesce(v_unlocked, false) then
    return true;
  end if;

  if v_gp >= v_threshold then
    insert into public.builder_mars_access (
      builder_id,
      unlocked,
      unlocked_at,
      unlock_gp,
      created_at,
      updated_at
    )
    values (
      v_builder_id,
      true,
      now(),
      v_gp,
      now(),
      now()
    )
    on conflict (builder_id)
    do update
    set
      unlocked = true,
      unlocked_at =
        coalesce(
          public.builder_mars_access.unlocked_at,
          excluded.unlocked_at
        ),
      unlock_gp =
        coalesce(
          public.builder_mars_access.unlock_gp,
          excluded.unlock_gp
        ),
      updated_at = now();

    return true;
  end if;

  return false;
end;
$$;


revoke all
on function public.ensure_my_mars_access()
from public, anon, authenticated;

grant execute
on function public.ensure_my_mars_access()
to authenticated;


-- ------------------------------------------------------------
-- Public authenticated read model
-- ------------------------------------------------------------

create or replace function public.get_my_mars_access()
returns table (
  builder_id uuid,
  current_gp bigint,
  required_gp bigint,
  remaining_gp bigint,
  unlocked boolean,
  unlocked_at timestamptz,
  unlock_gp bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_gp bigint;
  v_required bigint :=
    public.get_mars_unlock_threshold();
  v_unlocked boolean;
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  select coalesce(bp.gp, 0)
  into v_gp
  from public.builder_profiles bp
  where bp.builder_id = v_builder_id;

  if not found then
    raise exception 'BUILDER_PROFILE_REQUIRED'
      using errcode = '42501';
  end if;

  v_unlocked := public.ensure_my_mars_access();

  return query
  select
    v_builder_id,
    v_gp,
    v_required,
    case
      when v_unlocked then 0::bigint
      else greatest(v_required - v_gp, 0::bigint)
    end,
    v_unlocked,
    access.unlocked_at,
    access.unlock_gp
  from (select 1) seed
  left join public.builder_mars_access access
    on access.builder_id = v_builder_id;
end;
$$;


revoke all
on function public.get_my_mars_access()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_access()
to authenticated;


-- ------------------------------------------------------------
-- Server-side write guard
--
-- Mars mutation RPCs will call this.
-- Frontend cannot bypass it.
-- ------------------------------------------------------------

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


revoke all
on function public.assert_my_mars_access()
from public, anon, authenticated;

grant execute
on function public.assert_my_mars_access()
to authenticated;


comment on table public.builder_mars_access is
'Persistent BUILD MARS unlock state. Unlock is permanent after the Builder first reaches the required authoritative Total GP.';

comment on function public.get_mars_unlock_threshold() is
'Returns the authoritative BUILD MARS unlock threshold.';

comment on function public.ensure_my_mars_access() is
'Evaluates authenticated Builder Total GP and permanently records BUILD MARS unlock when eligible.';

comment on function public.get_my_mars_access() is
'Returns authenticated Builder BUILD MARS access state and progress toward unlock.';

comment on function public.assert_my_mars_access() is
'Server-side BUILD MARS mutation guard. Raises MARS_ACCESS_LOCKED until permanent Mars access is unlocked.';


commit;
