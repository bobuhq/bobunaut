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
#variable_conflict use_column
declare
  v_builder_id uuid;
begin
  v_builder_id := auth.uid();

  if v_builder_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.assert_my_mars_access();

  if not exists (
    select 1
    from public.mars_landmark_catalog as c
    where c.landmark_key = p_landmark_key
      and c.sector_key = 'ares'
      and c.is_active = true
  ) then
    raise exception 'Unknown or inactive Ares landmark';
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
    on c.landmark_key = d.landmark_key
  where d.builder_id = v_builder_id
    and d.landmark_key = p_landmark_key;
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
#variable_conflict use_column
declare
  v_builder_id uuid;
  v_started_at timestamptz;
  v_status text;
begin
  v_builder_id := auth.uid();

  if v_builder_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.assert_my_mars_access();

  select
    d.survey_started_at,
    d.status
  into
    v_started_at,
    v_status
  from public.builder_mars_landmark_discoveries as d
  where d.builder_id = v_builder_id
    and d.landmark_key = p_landmark_key
  for update;

  if not found then
    raise exception 'Landmark survey not started';
  end if;

  if
    v_status <> 'discovered'
    and now() <
      v_started_at + interval '3 seconds'
  then
    raise exception 'Landmark survey still in progress';
  end if;

  if v_status <> 'discovered' then
    update public.builder_mars_landmark_discoveries as d
    set
      status = 'discovered',
      discovered_at = now(),
      updated_at = now()
    where d.builder_id = v_builder_id
      and d.landmark_key = p_landmark_key;
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
    on c.landmark_key = d.landmark_key
  where d.builder_id = v_builder_id
    and d.landmark_key = p_landmark_key;
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
#variable_conflict use_column
declare
  v_builder_id uuid;
begin
  v_builder_id := auth.uid();

  if v_builder_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.assert_my_mars_access();

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
    on c.landmark_key = d.landmark_key
  where d.builder_id = v_builder_id
    and c.sector_key = 'ares'
  order by d.created_at asc;
end;
$$;
