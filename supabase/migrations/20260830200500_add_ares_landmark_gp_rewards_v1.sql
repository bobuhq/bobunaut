alter table public.builder_mars_landmark_discoveries
add column if not exists reward_gp bigint not null default 0;

alter table public.builder_mars_landmark_discoveries
add column if not exists reward_ledger_id uuid
references public.builder_reward_ledger(id);

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
  v_reward_gp bigint := 100;
  v_award record;
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

  if v_status = 'discovered' then
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

    return;
  end if;

  if now() <
    v_started_at + interval '3 seconds'
  then
    raise exception 'Landmark survey still in progress';
  end if;

  select *
  into v_award
  from public.award_builder_gp(
    v_builder_id,
    'mars_landmark',
    v_reward_gp,
    'mars-landmark:' || p_landmark_key,
    'mars',
    jsonb_build_object(
      'sector',
      'ares',
      'landmark_key',
      p_landmark_key,
      'type',
      'terrain_landmark_discovery'
    )
  );

  update public.builder_mars_landmark_discoveries as d
  set
    status = 'discovered',
    discovered_at = now(),
    reward_gp =
      case
        when v_award.awarded
          then v_reward_gp
        else reward_gp
      end,
    reward_ledger_id =
      case
        when v_award.awarded
          then v_award.ledger_id
        else reward_ledger_id
      end,
    updated_at = now()
  where d.builder_id = v_builder_id
    and d.landmark_key = p_landmark_key;

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

revoke all
on function public.complete_my_ares_landmark_survey(text)
from public, anon;

grant execute
on function public.complete_my_ares_landmark_survey(text)
to authenticated;

comment on function public.complete_my_ares_landmark_survey(text)
is 'Completes a first-time authenticated Builder Ares landmark survey after the server survey duration and awards 100 Personal GP idempotently. Previously discovered landmarks are not retroactively rewarded.';
