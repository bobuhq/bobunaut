begin;

drop trigger if exists
  mars_pixel_network_config_set_updated_at
on public.mars_pixel_network_config;

create trigger
  mars_pixel_network_config_set_updated_at
before update
on public.mars_pixel_network_config
for each row
execute function public.bobu_set_updated_at();


drop trigger if exists
  mars_pixel_reserved_zones_set_updated_at
on public.mars_pixel_reserved_zones;

create trigger
  mars_pixel_reserved_zones_set_updated_at
before update
on public.mars_pixel_reserved_zones
for each row
execute function public.bobu_set_updated_at();


drop trigger if exists
  mars_advertisers_set_updated_at
on public.mars_advertisers;

create trigger
  mars_advertisers_set_updated_at
before update
on public.mars_advertisers
for each row
execute function public.bobu_set_updated_at();


drop trigger if exists
  mars_pixel_allocations_set_updated_at
on public.mars_pixel_allocations;

create trigger
  mars_pixel_allocations_set_updated_at
before update
on public.mars_pixel_allocations
for each row
execute function public.bobu_set_updated_at();


drop trigger if exists
  mars_ad_creatives_set_updated_at
on public.mars_ad_creatives;

create trigger
  mars_ad_creatives_set_updated_at
before update
on public.mars_ad_creatives
for each row
execute function public.bobu_set_updated_at();


create or replace function public.prevent_mars_pixel_allocation_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception
    using
      errcode = '55000',
      message = 'mars_pixel_allocation_events is immutable; update and delete operations are not allowed';
end;
$$;

revoke all on function public.prevent_mars_pixel_allocation_event_mutation()
from public, anon, authenticated;


drop trigger if exists
  prevent_mars_pixel_allocation_events_update
on public.mars_pixel_allocation_events;

create trigger
  prevent_mars_pixel_allocation_events_update
before update
on public.mars_pixel_allocation_events
for each row
execute function public.prevent_mars_pixel_allocation_event_mutation();


drop trigger if exists
  prevent_mars_pixel_allocation_events_delete
on public.mars_pixel_allocation_events;

create trigger
  prevent_mars_pixel_allocation_events_delete
before delete
on public.mars_pixel_allocation_events
for each row
execute function public.prevent_mars_pixel_allocation_event_mutation();


comment on function public.prevent_mars_pixel_allocation_event_mutation() is
'Prevents mutation or deletion of immutable Mars Pixel allocation audit history.';

commit;
