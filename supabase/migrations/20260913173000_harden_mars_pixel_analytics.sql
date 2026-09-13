begin;

-- ============================================================
-- BOBU Mars Pixel Security Hardening #3
-- Analytics dedup + trigger-function privilege reduction
-- ============================================================

-- Internal trigger functions do not need direct client EXECUTE.
revoke execute
on function public.archive_completed_ares_research()
from public, anon, authenticated;

revoke execute
on function public.bootstrap_mars_colony_command_hub()
from public, anon, authenticated;


-- Normalize empty session keys.
update public.mars_pixel_ad_events
set session_key = null
where session_key is not null
  and btrim(session_key) = '';


-- Remove existing duplicate impressions.
-- Keep the oldest record per allocation/session.
delete from public.mars_pixel_ad_events newer
using public.mars_pixel_ad_events older
where newer.event_type = 'impression'
  and older.event_type = 'impression'
  and newer.session_key is not null
  and older.session_key = newer.session_key
  and older.allocation_id = newer.allocation_id
  and (
    older.occurred_at < newer.occurred_at
    or (
      older.occurred_at = newer.occurred_at
      and older.id < newer.id
    )
  );


-- One impression per allocation/session.
-- Other analytics events remain repeatable.
create unique index if not exists
mars_pixel_ad_events_unique_session_impression_idx
on public.mars_pixel_ad_events (
  allocation_id,
  session_key
)
where event_type = 'impression'
  and session_key is not null;


-- Make analytics recording idempotent for duplicate impressions.
create or replace function public.record_mars_pixel_ad_event_v1(
  p_allocation_id uuid,
  p_event_type text,
  p_session_key text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_type text;
  v_session_key text;
begin
  if p_allocation_id is null then
    return;
  end if;

  v_event_type := lower(trim(coalesce(p_event_type, '')));

  if v_event_type not in (
    'impression',
    'card_open',
    'cta_click'
  ) then
    raise exception 'MARS_PIXEL_INVALID_ANALYTICS_EVENT'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.mars_pixel_allocations as allocation
    join public.mars_advertisers as advertiser
      on advertiser.id = allocation.advertiser_id
    join public.mars_ad_creatives as creative
      on creative.allocation_id = allocation.id
    where allocation.id = p_allocation_id
      and allocation.allocation_status = 'owned'
      and advertiser.status = 'active'
      and creative.status = 'active'
  ) then
    return;
  end if;

  v_session_key :=
    nullif(
      left(
        trim(coalesce(p_session_key, '')),
        128
      ),
      ''
    );

  if v_event_type = 'impression'
     and v_session_key is not null then

    insert into public.mars_pixel_ad_events (
      allocation_id,
      event_type,
      session_key
    )
    values (
      p_allocation_id,
      v_event_type,
      v_session_key
    )
    on conflict (allocation_id, session_key)
    where event_type = 'impression'
      and session_key is not null
    do nothing;

    return;
  end if;

  insert into public.mars_pixel_ad_events (
    allocation_id,
    event_type,
    session_key
  )
  values (
    p_allocation_id,
    v_event_type,
    v_session_key
  );
end;
$$;

-- Preserve intended public advertising analytics access.
revoke all
on function public.record_mars_pixel_ad_event_v1(
  uuid,
  text,
  text
)
from public;

grant execute
on function public.record_mars_pixel_ad_event_v1(
  uuid,
  text,
  text
)
to anon, authenticated, service_role;

commit;
