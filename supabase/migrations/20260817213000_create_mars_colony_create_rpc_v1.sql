begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Colony Create RPC v1
--
-- Server-authoritative Colony creation.
-- Does not award GP.
-- Does not modify Galaxy / Referral / Mining / Wallet.
-- ============================================================

-- Colony names must also be unique case-insensitively.
create unique index if not exists
  mars_colonies_name_lower_unique_idx
on public.mars_colonies(lower(name));


create or replace function public.create_my_mars_colony(
  p_name text,
  p_specialization text default 'general'
)
returns table (
  colony_id uuid,
  colony_code text,
  colony_name text,
  specialization text,
  colony_status text,
  member_count bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_name text;
  v_specialization text;
  v_colony_id uuid;
  v_colony_code text;
  v_created_at timestamptz;
begin
  -- ----------------------------------------------------------
  -- Authentication
  -- ----------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- Input normalization / validation
  -- ----------------------------------------------------------

  v_name := trim(coalesce(p_name, ''));

  if char_length(v_name) < 3
     or char_length(v_name) > 40
  then
    raise exception 'INVALID_COLONY_NAME'
      using errcode = '22023';
  end if;

  if v_name !~ '^[A-Za-z0-9][A-Za-z0-9 _-]{1,38}[A-Za-z0-9]$'
  then
    raise exception 'INVALID_COLONY_NAME_FORMAT'
      using errcode = '22023';
  end if;

  v_specialization :=
    lower(trim(coalesce(p_specialization, 'general')));

  if v_specialization not in (
    'general',
    'mining',
    'exploration',
    'science',
    'architecture',
    'guardian',
    'command'
  ) then
    raise exception 'INVALID_COLONY_SPECIALIZATION'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- One active Colony per Builder
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.mars_colony_memberships m
    where m.builder_id = v_builder_id
      and m.status = 'active'
  ) then
    raise exception 'ACTIVE_COLONY_ALREADY_EXISTS'
      using errcode = '23505';
  end if;


  -- ----------------------------------------------------------
  -- Case-insensitive Colony name uniqueness
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.mars_colonies c
    where lower(c.name) = lower(v_name)
      and c.status <> 'archived'
  ) then
    raise exception 'COLONY_NAME_ALREADY_EXISTS'
      using errcode = '23505';
  end if;


  -- ----------------------------------------------------------
  -- Generate immutable Colony identity
  -- ----------------------------------------------------------

  v_colony_id := gen_random_uuid();

  v_colony_code :=
    'CLY-' ||
    upper(
      substr(
        replace(v_colony_id::text, '-', ''),
        1,
        12
      )
    );

  v_created_at := now();


  -- ----------------------------------------------------------
  -- Create Colony
  -- ----------------------------------------------------------

  insert into public.mars_colonies (
    id,
    colony_code,
    name,
    founder_builder_id,
    leader_builder_id,
    specialization,
    status,
    member_count,
    total_contribution,
    created_at,
    updated_at
  )
  values (
    v_colony_id,
    v_colony_code,
    v_name,
    v_builder_id,
    v_builder_id,
    v_specialization,
    'active',
    1,
    0,
    v_created_at,
    v_created_at
  );


  -- ----------------------------------------------------------
  -- Founder becomes first active member.
  -- ----------------------------------------------------------

  insert into public.mars_colony_memberships (
    colony_id,
    builder_id,
    role,
    status,
    joined_at,
    created_at,
    updated_at
  )
  values (
    v_colony_id,
    v_builder_id,
    'founder',
    'active',
    v_created_at,
    v_created_at,
    v_created_at
  );


  -- ----------------------------------------------------------
  -- Immutable Colony history
  -- ----------------------------------------------------------

  insert into public.mars_colony_history (
    colony_id,
    event_type,
    event_key,
    actor_builder_id,
    subject_builder_id,
    title,
    description,
    metadata,
    created_at
  )
  values (
    v_colony_id,
    'colony_created',
    'colony_created',
    v_builder_id,
    v_builder_id,
    'Colony Founded',
    v_name || ' was founded on Mars.',
    jsonb_build_object(
      'colony_code', v_colony_code,
      'specialization', v_specialization
    ),
    v_created_at
  );


  -- ----------------------------------------------------------
  -- Return safe public result.
  -- ----------------------------------------------------------

  return query
  select
    c.id,
    c.colony_code,
    c.name,
    c.specialization,
    c.status,
    c.member_count,
    c.created_at
  from public.mars_colonies c
  where c.id = v_colony_id;
end;
$$;


revoke all
on function public.create_my_mars_colony(text, text)
from public, anon, authenticated;

grant execute
on function public.create_my_mars_colony(text, text)
to authenticated;


comment on function public.create_my_mars_colony(text, text) is
'Creates one Mars Colony for the authenticated Builder. Creates founder membership and immutable Colony history atomically. Awards no GP.';


commit;
