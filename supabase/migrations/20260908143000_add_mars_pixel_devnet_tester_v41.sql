begin;

create or replace function public.get_my_mars_pixel_test_access_v1()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = auth.uid()
      and lower(coalesce(auth_user.email, '')) in (
        'bobuuniverse@gmail.com',
        'denyzcyber@gmail.com'
      )
      and (
        lower(coalesce(auth_user.email, '')) = 'denyzcyber@gmail.com'
        or exists (
          select 1
          from public.admin_users as admin_user
          where admin_user.user_id = auth_user.id
            and admin_user.active = true
            and admin_user.role in ('owner', 'admin')
        )
      )
  );
$$;

revoke all
on function public.get_my_mars_pixel_test_access_v1()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_pixel_test_access_v1()
to authenticated;

comment on function public.get_my_mars_pixel_test_access_v1()
is 'Restricted Mars Pixel test access. Preserves the existing authorized BOBU admin tester and adds denyzcyber@gmail.com as a Devnet-only test user. Does not activate the commercial network or Mainnet payments.';

commit;
