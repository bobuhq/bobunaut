begin;

create or replace function public.ensure_mars_pixel_devnet_advertiser_v1(
  p_builder_id uuid
)
returns table (
  advertiser_id uuid,
  advertiser_status text,
  created boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_auth_user_id uuid := auth.uid();
  v_advertiser public.mars_advertisers%rowtype;
begin
  if v_auth_user_id is null then
    raise exception 'MARS_PIXEL_AUTH_REQUIRED';
  end if;

  if p_builder_id is null or p_builder_id <> v_auth_user_id then
    raise exception 'MARS_PIXEL_BUILDER_MISMATCH';
  end if;

  if not public.get_my_mars_pixel_test_access_v1() then
    raise exception 'MARS_PIXEL_SOLANA_DEVNET_LOCKED';
  end if;

  /*
   * Serialize onboarding for this Builder without imposing a new
   * global uniqueness rule on historical advertiser records.
   */
  perform pg_advisory_xact_lock(
    hashtextextended(
      'mars_pixel_devnet_advertiser:' || p_builder_id::text,
      0
    )
  );

  select advertiser.*
  into v_advertiser
  from public.mars_advertisers as advertiser
  where advertiser.owner_builder_id = p_builder_id
    and advertiser.status in ('under_review', 'active')
  order by
    case when advertiser.status = 'active' then 0 else 1 end,
    advertiser.created_at asc
  limit 1;

  if found then
    return query
    select
      v_advertiser.id,
      v_advertiser.status,
      false;
    return;
  end if;

  insert into public.mars_advertisers (
    owner_builder_id,
    display_name,
    advertiser_type,
    status
  )
  values (
    p_builder_id,
    'BOBU Mars Advertiser',
    'personal',
    'under_review'
  )
  returning *
  into v_advertiser;

  return query
  select
    v_advertiser.id,
    v_advertiser.status,
    true;
end;
$function$;

revoke all
on function public.ensure_mars_pixel_devnet_advertiser_v1(uuid)
from public, anon, authenticated;

grant execute
on function public.ensure_mars_pixel_devnet_advertiser_v1(uuid)
to authenticated;

comment on function public.ensure_mars_pixel_devnet_advertiser_v1(uuid)
is 'Authenticated Devnet-only Mars Pixel advertiser onboarding. Reuses an existing active/under_review advertiser or atomically creates a personal under_review advertiser. Does not enable Mainnet/commercial access or activate advertising content.';

commit;
