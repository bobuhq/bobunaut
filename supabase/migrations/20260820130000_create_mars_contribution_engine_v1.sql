begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — CONTRIBUTION ENGINE V1
--
-- Server-authoritative internal primitive.
-- No direct authenticated execution.
--
-- Flow:
-- verified Mars event
--   -> immutable Builder contribution ledger
--   -> civilization aggregate
--   -> active Colony aggregate
--   -> active Sector aggregate
--
-- Duplicate source events are rejected by the existing
-- ledger uniqueness constraint.
-- ============================================================

create or replace function public.record_mars_contribution_internal(
  p_builder_id uuid,
  p_source_type text,
  p_source_reference_id text,
  p_contribution_type text,
  p_amount bigint,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  recorded boolean,
  contribution_id uuid,
  builder_id uuid,
  colony_id uuid,
  sector_id uuid,
  contribution_type text,
  amount bigint,
  civilization_total bigint,
  colony_total bigint,
  sector_total bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_contribution_id uuid;
  v_created_at timestamptz;

  v_colony_id uuid;
  v_sector_id uuid;

  v_civilization_total bigint := 0;
  v_colony_total bigint := 0;
  v_sector_total bigint := 0;

  v_civilization_count integer;
begin
  -- ----------------------------------------------------------
  -- Strict input validation.
  -- ----------------------------------------------------------

  if p_builder_id is null then
    raise exception 'BUILDER_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.builder_profiles bp
    where bp.builder_id = p_builder_id
  ) then
    raise exception 'BUILDER_NOT_FOUND';
  end if;

  if p_source_reference_id is null
     or btrim(p_source_reference_id) = '' then
    raise exception 'SOURCE_REFERENCE_REQUIRED';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_CONTRIBUTION_AMOUNT';
  end if;

  if p_source_type not in (
    'mining',
    'mission',
    'profession',
    'colony',
    'sector',
    'story',
    'event',
    'discovery',
    'system'
  ) then
    raise exception 'INVALID_CONTRIBUTION_SOURCE_TYPE';
  end if;

  if p_contribution_type not in (
    'energy',
    'water',
    'habitats',
    'science',
    'exploration',
    'security',
    'general'
  ) then
    raise exception 'INVALID_CONTRIBUTION_TYPE';
  end if;

  -- ----------------------------------------------------------
  -- Lock the Builder row.
  -- This serializes contribution processing for the Builder.
  -- ----------------------------------------------------------

  perform 1
  from public.builder_profiles bp
  where bp.builder_id = p_builder_id
  for update;

  -- ----------------------------------------------------------
  -- Resolve Builder's active Colony.
  --
  -- A Builder may contribute to Civilization without Colony
  -- membership. Colony/Sector aggregation is therefore
  -- optional.
  -- ----------------------------------------------------------

  select membership.colony_id
  into v_colony_id
  from public.mars_colony_memberships membership
  join public.mars_colonies colony
    on colony.id = membership.colony_id
  where membership.builder_id = p_builder_id
    and membership.status = 'active'
    and colony.status = 'active'
  order by membership.created_at desc
  limit 1;

  -- ----------------------------------------------------------
  -- Resolve active Sector for active Colony.
  -- ----------------------------------------------------------

  if v_colony_id is not null then
    select assignment.sector_id
    into v_sector_id
    from public.mars_colony_sector_assignments assignment
    join public.mars_sectors sector
      on sector.id = assignment.sector_id
    where assignment.colony_id = v_colony_id
      and assignment.status = 'active'
      and sector.status = 'active'
    limit 1;
  end if;

  -- ----------------------------------------------------------
  -- Immutable ledger.
  --
  -- Existing unique constraint:
  -- builder_id + source_type + source_reference_id
  -- + contribution_type
  --
  -- guarantees event idempotency.
  -- ----------------------------------------------------------

  begin
    insert into public.mars_contribution_ledger (
      builder_id,
      source_type,
      source_reference_id,
      contribution_type,
      amount,
      metadata
    )
    values (
      p_builder_id,
      p_source_type,
      btrim(p_source_reference_id),
      p_contribution_type,
      p_amount,
      coalesce(p_metadata, '{}'::jsonb)
    )
    returning
      id,
      mars_contribution_ledger.created_at
    into
      v_contribution_id,
      v_created_at;

  exception
    when unique_violation then
      raise exception 'CONTRIBUTION_ALREADY_RECORDED';
  end;

  -- ----------------------------------------------------------
  -- Civilization aggregate.
  --
  -- BUILD MARS currently operates with one active
  -- civilization state. Fail closed if the invariant breaks.
  -- ----------------------------------------------------------

  select count(*)
  into v_civilization_count
  from public.mars_civilization_state civilization
  where civilization.status = 'active';

  if v_civilization_count <> 1 then
    raise exception 'INVALID_ACTIVE_CIVILIZATION_STATE';
  end if;

  update public.mars_civilization_state civilization
  set
    energy =
      civilization.energy +
      case
        when p_contribution_type = 'energy'
          then p_amount
        else 0
      end,

    water =
      civilization.water +
      case
        when p_contribution_type = 'water'
          then p_amount
        else 0
      end,

    habitats =
      civilization.habitats +
      case
        when p_contribution_type = 'habitats'
          then p_amount
        else 0
      end,

    science =
      civilization.science +
      case
        when p_contribution_type = 'science'
          then p_amount
        else 0
      end,

    exploration =
      civilization.exploration +
      case
        when p_contribution_type = 'exploration'
          then p_amount
        else 0
      end,

    security =
      civilization.security +
      case
        when p_contribution_type = 'security'
          then p_amount
        else 0
      end,

    total_contribution =
      civilization.total_contribution + p_amount,

    updated_at = now()

  where civilization.status = 'active'

  returning civilization.total_contribution
  into v_civilization_total;

  -- ----------------------------------------------------------
  -- Colony aggregate.
  -- ----------------------------------------------------------

  if v_colony_id is not null then
    update public.mars_colonies colony
    set
      total_contribution =
        colony.total_contribution + p_amount,
      updated_at = now()
    where colony.id = v_colony_id
    returning colony.total_contribution
    into v_colony_total;
  end if;

  -- ----------------------------------------------------------
  -- Sector aggregate.
  -- ----------------------------------------------------------

  if v_sector_id is not null then
    update public.mars_sectors sector
    set
      total_contribution =
        sector.total_contribution + p_amount,
      updated_at = now()
    where sector.id = v_sector_id
    returning sector.total_contribution
    into v_sector_total;
  end if;

  -- ----------------------------------------------------------
  -- Result.
  -- ----------------------------------------------------------

  return query
  select
    true,
    v_contribution_id,
    p_builder_id,
    v_colony_id,
    v_sector_id,
    p_contribution_type,
    p_amount,
    v_civilization_total,
    coalesce(v_colony_total, 0),
    coalesce(v_sector_total, 0),
    v_created_at;
end;
$$;

-- ============================================================
-- SECURITY
-- ============================================================

revoke all
on function public.record_mars_contribution_internal(
  uuid,
  text,
  text,
  text,
  bigint,
  jsonb
)
from public;

revoke all
on function public.record_mars_contribution_internal(
  uuid,
  text,
  text,
  text,
  bigint,
  jsonb
)
from anon;

revoke all
on function public.record_mars_contribution_internal(
  uuid,
  text,
  text,
  text,
  bigint,
  jsonb
)
from authenticated;

grant execute
on function public.record_mars_contribution_internal(
  uuid,
  text,
  text,
  text,
  bigint,
  jsonb
)
to service_role;

comment on function public.record_mars_contribution_internal(
  uuid,
  text,
  text,
  text,
  bigint,
  jsonb
) is
'Internal BUILD MARS contribution primitive. Records one immutable Builder contribution and atomically propagates it to Civilization, active Colony, and active Sector totals. Not executable by authenticated clients. Awards no GP.';

commit;
