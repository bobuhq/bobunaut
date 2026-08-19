begin;

-- ============================================================
-- BOBU BUILD MARS
-- Colony Resource Transaction Engine v1
--
-- Credits:
--   service_role only
--
-- Debits:
--   internal trusted SQL callers only
--
-- Browser cannot mutate balances directly.
-- ============================================================


-- ============================================================
-- CREDIT ENGINE
-- ============================================================

create or replace function
public.credit_mars_colony_resource(
  p_colony_id uuid,
  p_resource_type text,
  p_amount bigint,
  p_source_type text,
  p_source_reference_id text,
  p_actor_builder_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  credited boolean,
  colony_id uuid,
  resource_type text,
  amount bigint,
  new_balance bigint,
  ledger_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_resource_type text :=
    lower(trim(coalesce(p_resource_type, '')));

  v_source_type text :=
    trim(coalesce(p_source_type, ''));

  v_source_reference_id text :=
    trim(coalesce(p_source_reference_id, ''));

  v_ledger_id uuid;
  v_new_balance bigint;
begin
  if p_colony_id is null then
    raise exception 'COLONY_REQUIRED'
      using errcode = '22023';
  end if;

  if v_resource_type not in (
    'materials',
    'energy',
    'water',
    'science',
    'food'
  ) then
    raise exception 'INVALID_RESOURCE_TYPE'
      using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_RESOURCE_AMOUNT'
      using errcode = '22023';
  end if;

  if char_length(v_source_type) = 0 then
    raise exception 'SOURCE_TYPE_REQUIRED'
      using errcode = '22023';
  end if;

  if char_length(v_source_reference_id) = 0 then
    raise exception 'SOURCE_REFERENCE_REQUIRED'
      using errcode = '22023';
  end if;

  if p_metadata is null
     or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'INVALID_METADATA'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.mars_colonies c
    where c.id = p_colony_id
      and c.status = 'active'
  ) then
    raise exception 'ACTIVE_COLONY_REQUIRED'
      using errcode = '22023';
  end if;

  insert into public.mars_colony_resources (
    colony_id
  )
  values (
    p_colony_id
  )
  on conflict on constraint mars_colony_resources_pkey
  do nothing;

  insert into public.mars_colony_resource_ledger (
    colony_id,
    actor_builder_id,
    resource_type,
    transaction_type,
    amount,
    source_type,
    source_reference_id,
    metadata
  )
  values (
    p_colony_id,
    p_actor_builder_id,
    v_resource_type,
    'credit',
    p_amount,
    v_source_type,
    v_source_reference_id,
    p_metadata
  )
  on conflict (
    colony_id,
    resource_type,
    transaction_type,
    source_type,
    source_reference_id
  )
  do nothing
  returning id
  into v_ledger_id;

  if v_ledger_id is null then
    execute format(
      'select %I from public.mars_colony_resources where colony_id = $1',
      v_resource_type
    )
    into v_new_balance
    using p_colony_id;

    return query
    select
      false,
      p_colony_id,
      v_resource_type,
      p_amount,
      coalesce(v_new_balance, 0),
      null::uuid;

    return;
  end if;

  execute format(
    'update public.mars_colony_resources
     set %I = %I + $1,
         updated_at = now()
     where colony_id = $2
     returning %I',
    v_resource_type,
    v_resource_type,
    v_resource_type
  )
  into v_new_balance
  using p_amount, p_colony_id;

  return query
  select
    true,
    p_colony_id,
    v_resource_type,
    p_amount,
    v_new_balance,
    v_ledger_id;
end;
$$;


revoke all
on function public.credit_mars_colony_resource(
  uuid,
  text,
  bigint,
  text,
  text,
  uuid,
  jsonb
)
from public, anon, authenticated;

grant execute
on function public.credit_mars_colony_resource(
  uuid,
  text,
  bigint,
  text,
  text,
  uuid,
  jsonb
)
to service_role;


-- ============================================================
-- INTERNAL DEBIT ENGINE
--
-- Not exposed to authenticated/service_role directly.
-- Intended to be called by trusted SECURITY DEFINER gameplay RPCs.
-- ============================================================

create or replace function
public.debit_mars_colony_resource_internal(
  p_colony_id uuid,
  p_resource_type text,
  p_amount bigint,
  p_source_type text,
  p_source_reference_id text,
  p_actor_builder_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  debited boolean,
  colony_id uuid,
  resource_type text,
  amount bigint,
  new_balance bigint,
  ledger_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_resource_type text :=
    lower(trim(coalesce(p_resource_type, '')));

  v_source_type text :=
    trim(coalesce(p_source_type, ''));

  v_source_reference_id text :=
    trim(coalesce(p_source_reference_id, ''));

  v_current_balance bigint;
  v_new_balance bigint;
  v_ledger_id uuid;
begin
  if p_colony_id is null then
    raise exception 'COLONY_REQUIRED'
      using errcode = '22023';
  end if;

  if v_resource_type not in (
    'materials',
    'energy',
    'water',
    'science',
    'food'
  ) then
    raise exception 'INVALID_RESOURCE_TYPE'
      using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_RESOURCE_AMOUNT'
      using errcode = '22023';
  end if;

  if char_length(v_source_type) = 0 then
    raise exception 'SOURCE_TYPE_REQUIRED'
      using errcode = '22023';
  end if;

  if char_length(v_source_reference_id) = 0 then
    raise exception 'SOURCE_REFERENCE_REQUIRED'
      using errcode = '22023';
  end if;

  if p_metadata is null
     or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'INVALID_METADATA'
      using errcode = '22023';
  end if;

  insert into public.mars_colony_resources (
    colony_id
  )
  values (
    p_colony_id
  )
  on conflict on constraint mars_colony_resources_pkey
  do nothing;

  execute format(
    'select %I
     from public.mars_colony_resources
     where colony_id = $1
     for update',
    v_resource_type
  )
  into v_current_balance
  using p_colony_id;

  if coalesce(v_current_balance, 0) < p_amount then
    raise exception 'INSUFFICIENT_COLONY_RESOURCE'
      using errcode = '22023';
  end if;

  insert into public.mars_colony_resource_ledger (
    colony_id,
    actor_builder_id,
    resource_type,
    transaction_type,
    amount,
    source_type,
    source_reference_id,
    metadata
  )
  values (
    p_colony_id,
    p_actor_builder_id,
    v_resource_type,
    'debit',
    p_amount,
    v_source_type,
    v_source_reference_id,
    p_metadata
  )
  on conflict (
    colony_id,
    resource_type,
    transaction_type,
    source_type,
    source_reference_id
  )
  do nothing
  returning id
  into v_ledger_id;

  if v_ledger_id is null then
    return query
    select
      false,
      p_colony_id,
      v_resource_type,
      p_amount,
      v_current_balance,
      null::uuid;

    return;
  end if;

  execute format(
    'update public.mars_colony_resources
     set %I = %I - $1,
         updated_at = now()
     where colony_id = $2
     returning %I',
    v_resource_type,
    v_resource_type,
    v_resource_type
  )
  into v_new_balance
  using p_amount, p_colony_id;

  return query
  select
    true,
    p_colony_id,
    v_resource_type,
    p_amount,
    v_new_balance,
    v_ledger_id;
end;
$$;


revoke all
on function public.debit_mars_colony_resource_internal(
  uuid,
  text,
  bigint,
  text,
  text,
  uuid,
  jsonb
)
from public, anon, authenticated, service_role;


comment on function public.credit_mars_colony_resource(
  uuid,
  text,
  bigint,
  text,
  text,
  uuid,
  jsonb
) is
'Credits spendable BUILD MARS Colony resources using idempotent immutable ledger entries. Service role only.';

comment on function public.debit_mars_colony_resource_internal(
  uuid,
  text,
  bigint,
  text,
  text,
  uuid,
  jsonb
) is
'Internal atomic BUILD MARS Colony resource debit engine. Intended only for trusted gameplay RPCs.';


commit;
