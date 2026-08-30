create table public.mars_landmark_catalog (
  landmark_key text primary key,
  sector_key text not null,
  title text not null,
  classification text not null,
  world_x double precision not null,
  world_z double precision not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.mars_landmark_catalog (
  landmark_key,
  sector_key,
  title,
  classification,
  world_x,
  world_z
)
values
  (
    'ares-ridge-01',
    'ares',
    'Ares Ridge',
    'RIDGE',
    -125.5,
    -276.1
  ),
  (
    'ares-depression-01',
    'ares',
    'Ares Basin',
    'DEPRESSION',
    527.1,
    -225.9
  ),
  (
    'ares-escarpment-01',
    'ares',
    'Ares Escarpment',
    'ESCARPMENT',
    225.9,
    -426.7
  );

revoke all
on public.mars_landmark_catalog
from public, anon, authenticated;

grant select
on public.mars_landmark_catalog
to authenticated;

create table public.builder_mars_landmark_discoveries (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references auth.users(id)
    on delete cascade,

  landmark_key text not null
    references public.mars_landmark_catalog(
      landmark_key
    )
    on delete restrict,

  status text not null
    check (
      status in (
        'surveying',
        'discovered'
      )
    ),

  survey_started_at timestamptz not null,

  discovered_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique (
    builder_id,
    landmark_key
  )
);

create index
  builder_mars_landmark_discoveries_builder_idx
on public.builder_mars_landmark_discoveries (
  builder_id,
  discovered_at desc
);

alter table public.builder_mars_landmark_discoveries
enable row level security;

revoke all
on public.builder_mars_landmark_discoveries
from public, anon, authenticated;

grant select
on public.builder_mars_landmark_discoveries
to authenticated;

create policy
  "Builders can read own Mars landmark discoveries"
on public.builder_mars_landmark_discoveries
for select
to authenticated
using (
  builder_id = auth.uid()
);

create or replace function public.start_my_ares_landmark_survey(
  p_landmark_key text
)
returns table (
  landmark_key text,
  landmark_title text,
  classification text,
  status text,
  survey_started_at timestamptz,
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

  if not exists (
    select 1
    from public.mars_landmark_catalog as c
    where
      c.landmark_key =
        p_landmark_key
      and c.sector_key =
        'ares'
      and c.is_active =
        true
  ) then
    raise exception
      'Unknown or inactive Ares landmark';
  end if;

  insert into public.builder_mars_landmark_discoveries (
    builder_id,
    landmark_key,
    status,
    survey_started_at
  )
  values (
    v_builder_id,
    p_landmark_key,
    'surveying',
    now()
  )
  on conflict (
    builder_id,
    landmark_key
  )
  do nothing;

  return query
  select
    d.landmark_key,
    c.title,
    c.classification,
    d.status,
    d.survey_started_at,
    d.discovered_at
  from public.builder_mars_landmark_discoveries as d
  join public.mars_landmark_catalog as c
    on c.landmark_key =
      d.landmark_key
  where
    d.builder_id =
      v_builder_id
    and d.landmark_key =
      p_landmark_key;
end;
$$;

create or replace function public.complete_my_ares_landmark_survey(
  p_landmark_key text
)
returns table (
  landmark_key text,
  landmark_title text,
  classification text,
  status text,
  survey_started_at timestamptz,
  discovered_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_builder_id uuid;
  v_started_at timestamptz;
  v_status text;
begin
  v_builder_id :=
    auth.uid();

  if v_builder_id is null then
    raise exception
      'Authentication required';
  end if;

  perform
    public.assert_my_mars_access();

  select
    d.survey_started_at,
    d.status
  into
    v_started_at,
    v_status
  from public.builder_mars_landmark_discoveries as d
  where
    d.builder_id =
      v_builder_id
    and d.landmark_key =
      p_landmark_key
  for update;

  if not found then
    raise exception
      'Landmark survey not started';
  end if;

  if
    v_status <> 'discovered'
    and now() <
      v_started_at +
      interval '3 seconds'
  then
    raise exception
      'Landmark survey still in progress';
  end if;

  if v_status <> 'discovered' then
    update public.builder_mars_landmark_discoveries as d
    set
      status =
        'discovered',
      discovered_at =
        now(),
      updated_at =
        now()
    where
      d.builder_id =
        v_builder_id
      and d.landmark_key =
        p_landmark_key;
  end if;

  return query
  select
    d.landmark_key,
    c.title,
    c.classification,
    d.status,
    d.survey_started_at,
    d.discovered_at
  from public.builder_mars_landmark_discoveries as d
  join public.mars_landmark_catalog as c
    on c.landmark_key =
      d.landmark_key
  where
    d.builder_id =
      v_builder_id
    and d.landmark_key =
      p_landmark_key;
end;
$$;

create or replace function public.get_my_ares_landmark_discoveries()
returns table (
  landmark_key text,
  landmark_title text,
  classification text,
  status text,
  survey_started_at timestamptz,
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
    d.landmark_key,
    c.title,
    c.classification,
    d.status,
    d.survey_started_at,
    d.discovered_at
  from public.builder_mars_landmark_discoveries as d
  join public.mars_landmark_catalog as c
    on c.landmark_key =
      d.landmark_key
  where
    d.builder_id =
      v_builder_id
    and c.sector_key =
      'ares'
  order by
    d.discovered_at desc nulls last,
    d.created_at desc;
end;
$$;

revoke all
on function public.start_my_ares_landmark_survey(text)
from public, anon;

revoke all
on function public.complete_my_ares_landmark_survey(text)
from public, anon;

revoke all
on function public.get_my_ares_landmark_discoveries()
from public, anon;

grant execute
on function public.start_my_ares_landmark_survey(text)
to authenticated;

grant execute
on function public.complete_my_ares_landmark_survey(text)
to authenticated;

grant execute
on function public.get_my_ares_landmark_discoveries()
to authenticated;
