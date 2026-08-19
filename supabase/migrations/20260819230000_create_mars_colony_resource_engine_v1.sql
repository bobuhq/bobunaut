begin;

-- ============================================================
-- BOBU BUILD MARS
-- Colony Resource Engine v1
--
-- Spendable Colony resources are deliberately separated from
-- permanent Builder/Civilization contribution history.
-- ============================================================

create table public.mars_colony_resources (
  colony_id uuid primary key
    references public.mars_colonies(id)
    on delete restrict,

  materials bigint not null default 0
    check (materials >= 0),

  energy bigint not null default 0
    check (energy >= 0),

  water bigint not null default 0
    check (water >= 0),

  science bigint not null default 0
    check (science >= 0),

  food bigint not null default 0
    check (food >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mars_colony_resource_ledger (
  id uuid primary key default gen_random_uuid(),

  colony_id uuid not null
    references public.mars_colonies(id)
    on delete restrict,

  actor_builder_id uuid
    references public.builder_profiles(builder_id)
    on delete restrict,

  resource_type text not null
    check (
      resource_type in (
        'materials',
        'energy',
        'water',
        'science',
        'food'
      )
    ),

  transaction_type text not null
    check (
      transaction_type in (
        'credit',
        'debit'
      )
    ),

  amount bigint not null
    check (amount > 0),

  source_type text not null,

  source_reference_id text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index idx_mars_colony_resource_ledger_colony
on public.mars_colony_resource_ledger(
  colony_id,
  created_at desc
);

create index idx_mars_colony_resource_ledger_resource
on public.mars_colony_resource_ledger(
  colony_id,
  resource_type,
  created_at desc
);

create unique index
  mars_colony_resource_ledger_source_unique
on public.mars_colony_resource_ledger(
  colony_id,
  resource_type,
  transaction_type,
  source_type,
  source_reference_id
);

alter table public.mars_colony_resources
enable row level security;

alter table public.mars_colony_resource_ledger
enable row level security;

-- No direct authenticated table access.
revoke all
on public.mars_colony_resources
from public, anon, authenticated;

revoke all
on public.mars_colony_resource_ledger
from public, anon, authenticated;


-- ============================================================
-- Automatically create zero-balance resource account whenever
-- a real Colony is created.
-- ============================================================

create or replace function
public.bootstrap_mars_colony_resources()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.mars_colony_resources (
    colony_id
  )
  values (
    new.id
  )
  on conflict (colony_id)
  do nothing;

  return new;
end;
$$;

drop trigger if exists
  bootstrap_mars_colony_resources
on public.mars_colonies;

create trigger bootstrap_mars_colony_resources
after insert
on public.mars_colonies
for each row
execute function public.bootstrap_mars_colony_resources();


-- Backfill existing production Colonies.
insert into public.mars_colony_resources (
  colony_id
)
select c.id
from public.mars_colonies c
where c.status = 'active'
on conflict (colony_id)
do nothing;


-- ============================================================
-- Authenticated Colony Resource Read Model
-- ============================================================

create or replace function
public.get_my_mars_colony_resources()
returns table (
  colony_id uuid,
  colony_name text,
  materials bigint,
  energy bigint,
  water bigint,
  science bigint,
  food bigint,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_colony_id uuid;
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  select m.colony_id
  into v_colony_id
  from public.mars_colony_memberships m
  join public.mars_colonies c
    on c.id = m.colony_id
  where m.builder_id = v_builder_id
    and m.status = 'active'
    and c.status = 'active'
  limit 1;

  if v_colony_id is null then
    raise exception 'ACTIVE_COLONY_REQUIRED'
      using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.name,
    r.materials,
    r.energy,
    r.water,
    r.science,
    r.food,
    r.updated_at
  from public.mars_colonies c
  join public.mars_colony_resources r
    on r.colony_id = c.id
  where c.id = v_colony_id;
end;
$$;

revoke all
on function public.get_my_mars_colony_resources()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_colony_resources()
to authenticated;


comment on table public.mars_colony_resources is
'Current spendable resource balances owned by each BUILD MARS Colony.';

comment on table public.mars_colony_resource_ledger is
'Immutable BUILD MARS Colony resource credit/debit transaction history.';

comment on function public.get_my_mars_colony_resources() is
'Returns server-authoritative spendable resource balances for the authenticated Builder active Colony.';

commit;
