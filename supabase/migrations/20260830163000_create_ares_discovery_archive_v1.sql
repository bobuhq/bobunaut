create table if not exists public.mars_discovery_result_catalog (
  mission_key text primary key
    references public.mars_hidden_mission_catalog(mission_key)
    on delete cascade,

  classification text not null,

  finding_title text not null,

  finding_summary text not null,

  archive_code text not null unique,

  enabled boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

insert into public.mars_discovery_result_catalog (
  mission_key,
  classification,
  finding_title,
  finding_summary,
  archive_code,
  enabled
)
values
(
  'ares-echo-01',
  'Subsurface Signal Pattern',
  'Ares Echo Signature',
  'Field analysis archived a localized subsurface signal pattern detected during the Ares expedition. The record is classified as an in-universe exploration finding and does not represent a verified scientific discovery.',
  'ARES-ECHO-01',
  true
),
(
  'ares-fracture-02',
  'Geological Pattern',
  'Silent Fracture Profile',
  'Field analysis archived an unusual fracture profile observed during the Ares expedition. The record is classified as an in-universe exploration finding and does not represent a verified scientific discovery.',
  'ARES-FRACTURE-02',
  true
),
(
  'ares-relay-03',
  'Signal Artifact',
  'Buried Relay Signature',
  'Field analysis archived a localized signal artifact associated with the expedition target. The record is classified as an in-universe exploration finding and does not represent a verified scientific discovery.',
  'ARES-RELAY-03',
  true
),
(
  'ares-scar-04',
  'Surface Pattern',
  'Ares Scar Profile',
  'Field analysis archived a distinct surface pattern documented during the Ares expedition. The record is classified as an in-universe exploration finding and does not represent a verified scientific discovery.',
  'ARES-SCAR-04',
  true
)
on conflict (mission_key)
do update set
  classification =
    excluded.classification,
  finding_title =
    excluded.finding_title,
  finding_summary =
    excluded.finding_summary,
  archive_code =
    excluded.archive_code,
  enabled =
    excluded.enabled,
  updated_at =
    now();

create table if not exists public.builder_mars_discovery_archive (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  research_id uuid not null
    references public.builder_mars_research(id)
    on delete cascade,

  mission_key text not null
    references public.mars_hidden_mission_catalog(mission_key),

  cycle_key text not null,

  sector_key text not null default 'ares',

  classification text not null,

  finding_title text not null,

  finding_summary text not null,

  archive_code text not null,

  discovered_at timestamptz not null,

  created_at timestamptz not null default now(),

  unique (
    builder_id,
    research_id
  )
);

create index if not exists
  builder_mars_discovery_archive_builder_idx
on public.builder_mars_discovery_archive (
  builder_id,
  discovered_at desc
);

alter table public.builder_mars_discovery_archive
enable row level security;

revoke all
on public.builder_mars_discovery_archive
from public, anon, authenticated;

grant select
on public.builder_mars_discovery_archive
to authenticated;

drop policy if exists
  "Builders can read own Mars discovery archive"
on public.builder_mars_discovery_archive;

create policy
  "Builders can read own Mars discovery archive"
on public.builder_mars_discovery_archive
for select
to authenticated
using (
  builder_id = auth.uid()
);

create or replace function public.archive_completed_ares_research()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result
    public.mars_discovery_result_catalog%rowtype;
begin
  if
    new.status <> 'completed'
    or new.sector_key <> 'ares'
  then
    return new;
  end if;

  if
    tg_op = 'UPDATE'
    and old.status = 'completed'
  then
    return new;
  end if;

  select c.*
  into v_result
  from public.mars_discovery_result_catalog as c
  where
    c.mission_key = new.mission_key
    and c.enabled = true
  limit 1;

  if not found then
    return new;
  end if;

  insert into public.builder_mars_discovery_archive (
    builder_id,
    research_id,
    mission_key,
    cycle_key,
    sector_key,
    classification,
    finding_title,
    finding_summary,
    archive_code,
    discovered_at
  )
  values (
    new.builder_id,
    new.id,
    new.mission_key,
    new.cycle_key,
    new.sector_key,
    v_result.classification,
    v_result.finding_title,
    v_result.finding_summary,
    v_result.archive_code,
    coalesce(
      new.completed_at,
      now()
    )
  )
  on conflict (
    builder_id,
    research_id
  )
  do nothing;

  return new;
end;
$$;

drop trigger if exists
  archive_completed_ares_research_trigger
on public.builder_mars_research;

create trigger
  archive_completed_ares_research_trigger
after insert or update of status
on public.builder_mars_research
for each row
execute function
  public.archive_completed_ares_research();

insert into public.builder_mars_discovery_archive (
  builder_id,
  research_id,
  mission_key,
  cycle_key,
  sector_key,
  classification,
  finding_title,
  finding_summary,
  archive_code,
  discovered_at
)
select
  r.builder_id,
  r.id,
  r.mission_key,
  r.cycle_key,
  r.sector_key,
  c.classification,
  c.finding_title,
  c.finding_summary,
  c.archive_code,
  coalesce(
    r.completed_at,
    r.created_at
  )
from public.builder_mars_research as r
join public.mars_discovery_result_catalog as c
  on c.mission_key = r.mission_key
where
  r.status = 'completed'
  and r.sector_key = 'ares'
  and c.enabled = true
on conflict (
  builder_id,
  research_id
)
do nothing;

create or replace function public.get_my_ares_discovery_archive()
returns table (
  archive_id uuid,
  research_id uuid,
  mission_key text,
  mission_title text,
  cycle_key text,
  classification text,
  finding_title text,
  finding_summary text,
  archive_code text,
  discovered_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_builder_id uuid;
begin
  v_builder_id :=
    auth.uid();

  if v_builder_id is null then
    raise exception
      'Authentication required';
  end if;

  perform
    public.assert_my_mars_access();

  return query
  select
    a.id,
    a.research_id,
    a.mission_key,
    m.title,
    a.cycle_key,
    a.classification,
    a.finding_title,
    a.finding_summary,
    a.archive_code,
    a.discovered_at
  from public.builder_mars_discovery_archive as a
  join public.mars_hidden_mission_catalog as m
    on m.mission_key =
      a.mission_key
  where
    a.builder_id =
      v_builder_id
    and a.sector_key =
      'ares'
  order by
    a.discovered_at desc;
end;
$$;

revoke all
on function public.get_my_ares_discovery_archive()
from public, anon;

grant execute
on function public.get_my_ares_discovery_archive()
to authenticated;
