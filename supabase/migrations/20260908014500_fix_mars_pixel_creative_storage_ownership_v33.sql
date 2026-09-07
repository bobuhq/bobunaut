begin;

create or replace function public.is_mars_pixel_allocation_owner_v1(
  p_allocation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.mars_pixel_allocations as allocation
      join public.mars_advertisers as advertiser
        on advertiser.id = allocation.advertiser_id
      where allocation.id = p_allocation_id
        and allocation.allocation_status = 'owned'
        and advertiser.owner_builder_id = auth.uid()
    );
$$;

revoke all
on function public.is_mars_pixel_allocation_owner_v1(uuid)
from public, anon;

grant execute
on function public.is_mars_pixel_allocation_owner_v1(uuid)
to authenticated, service_role;

comment on function public.is_mars_pixel_allocation_owner_v1(uuid) is
'Server-authoritative Mars Pixel allocation ownership check for authenticated storage policies. Does not expose allocation or advertiser table access.';

drop policy if exists "mars_pixel_creatives_insert_owned_allocation"
on storage.objects;

drop policy if exists "mars_pixel_creatives_update_owned_allocation"
on storage.objects;

drop policy if exists "mars_pixel_creatives_delete_owned_allocation"
on storage.objects;

create policy "mars_pixel_creatives_insert_owned_allocation"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mars-pixel-creatives'
  and (storage.foldername(name))[1] = auth.uid()::text
  and case
    when array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[2] ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    then public.is_mars_pixel_allocation_owner_v1(
      ((storage.foldername(name))[2])::uuid
    )
    else false
  end
);

create policy "mars_pixel_creatives_update_owned_allocation"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'mars-pixel-creatives'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
  and case
    when array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[2] ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    then public.is_mars_pixel_allocation_owner_v1(
      ((storage.foldername(name))[2])::uuid
    )
    else false
  end
)
with check (
  bucket_id = 'mars-pixel-creatives'
  and (storage.foldername(name))[1] = auth.uid()::text
  and case
    when array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[2] ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    then public.is_mars_pixel_allocation_owner_v1(
      ((storage.foldername(name))[2])::uuid
    )
    else false
  end
);

create policy "mars_pixel_creatives_delete_owned_allocation"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'mars-pixel-creatives'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
  and case
    when array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[2] ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    then public.is_mars_pixel_allocation_owner_v1(
      ((storage.foldername(name))[2])::uuid
    )
    else false
  end
);

commit;
