begin;

create or replace function public.get_my_mars_pixel_test_access_v1()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from auth.users as auth_user
      where auth_user.id = auth.uid()
    );
$$;

revoke all
on function public.get_my_mars_pixel_test_access_v1()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_pixel_test_access_v1()
to authenticated;

comment on function public.get_my_mars_pixel_test_access_v1()
is 'Mars Pixel public Devnet test access for authenticated registered BOBU users. Does not activate the commercial network or Mainnet payments. Solana Devnet/devnet_testing gates remain authoritative.';

commit;
