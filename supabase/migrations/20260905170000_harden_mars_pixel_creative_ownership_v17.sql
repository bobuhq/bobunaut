create or replace function public.get_my_mars_pixel_creative_v1(
  p_allocation_id uuid
)
returns table (
  allocation_id uuid,
  pixel_count integer,
  creative_id uuid,
  creative_status text,
  title text,
  description text,
  image_url text,
  destination_url text,
  cta_label text,
  links jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_allocation public.mars_pixel_allocations%rowtype;
  v_advertiser public.mars_advertisers%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'MARS_PIXEL_AUTH_REQUIRED';
  end if;

  select *
  into v_allocation
  from public.mars_pixel_allocations
  where id = p_allocation_id
    and allocation_status = 'owned';

  if not found then
    raise exception 'MARS_PIXEL_ALLOCATION_NOT_FOUND';
  end if;

  select *
  into v_advertiser
  from public.mars_advertisers
  where id = v_allocation.advertiser_id;

  if not found
     or v_advertiser.owner_builder_id is distinct from v_user_id then
    raise exception 'MARS_PIXEL_NOT_ALLOCATION_OWNER';
  end if;

  return query
  select
    v_allocation.id,
    (v_allocation.width * v_allocation.height)::integer,
    c.id,
    c.status::text,
    c.title,
    c.description,
    c.image_url,
    c.destination_url,
    c.cta_label,
    coalesce(c.links, '[]'::jsonb)
  from (select 1) seed
  left join lateral (
    select mc.*
    from public.mars_ad_creatives mc
    where mc.allocation_id = v_allocation.id
      and mc.status in ('under_review', 'active')
    order by
      case when mc.status = 'under_review' then 0 else 1 end,
      mc.updated_at desc nulls last,
      mc.created_at desc
    limit 1
  ) c on true;
end;
$$;

revoke all on function public.get_my_mars_pixel_creative_v1(uuid)
from public;

grant execute
on function public.get_my_mars_pixel_creative_v1(uuid)
to authenticated, service_role;

comment on function public.get_my_mars_pixel_creative_v1(uuid) is
'Authenticated owner-only Mars Pixel creative detail. Returns the current under-review creative first, otherwise the active creative, only when auth.uid owns the allocation advertiser.';

drop policy if exists "mars_pixel_creatives_insert_own"
on storage.objects;

drop policy if exists "mars_pixel_creatives_update_own"
on storage.objects;

drop policy if exists "mars_pixel_creatives_delete_own"
on storage.objects;

create policy "mars_pixel_creatives_insert_owned_allocation"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mars-pixel-creatives'
  and (storage.foldername(name))[1] = auth.uid()::text
  and array_length(storage.foldername(name), 1) >= 2
  and (storage.foldername(name))[2] ~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  and exists (
    select 1
    from public.mars_pixel_allocations a
    join public.mars_advertisers ad
      on ad.id = a.advertiser_id
    where a.id = ((storage.foldername(name))[2])::uuid
      and a.allocation_status = 'owned'
      and ad.owner_builder_id = auth.uid()
  )
);

create policy "mars_pixel_creatives_update_owned_allocation"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'mars-pixel-creatives'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
  and array_length(storage.foldername(name), 1) >= 2
  and (storage.foldername(name))[2] ~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  and exists (
    select 1
    from public.mars_pixel_allocations a
    join public.mars_advertisers ad
      on ad.id = a.advertiser_id
    where a.id = ((storage.foldername(name))[2])::uuid
      and a.allocation_status = 'owned'
      and ad.owner_builder_id = auth.uid()
  )
)
with check (
  bucket_id = 'mars-pixel-creatives'
  and (storage.foldername(name))[1] = auth.uid()::text
  and array_length(storage.foldername(name), 1) >= 2
  and (storage.foldername(name))[2] ~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  and exists (
    select 1
    from public.mars_pixel_allocations a
    join public.mars_advertisers ad
      on ad.id = a.advertiser_id
    where a.id = ((storage.foldername(name))[2])::uuid
      and a.allocation_status = 'owned'
      and ad.owner_builder_id = auth.uid()
  )
);

create policy "mars_pixel_creatives_delete_owned_allocation"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'mars-pixel-creatives'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
  and array_length(storage.foldername(name), 1) >= 2
  and (storage.foldername(name))[2] ~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  and exists (
    select 1
    from public.mars_pixel_allocations a
    join public.mars_advertisers ad
      on ad.id = a.advertiser_id
    where a.id = ((storage.foldername(name))[2])::uuid
      and a.allocation_status = 'owned'
      and ad.owner_builder_id = auth.uid()
  )
);
