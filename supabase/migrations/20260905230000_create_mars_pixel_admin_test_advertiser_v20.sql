do $$
declare
  v_user_id uuid;
begin
  select id
  into v_user_id
  from auth.users
  where lower(email) = 'bobuuniverse@gmail.com'
  limit 1;

  if v_user_id is null then
    raise exception 'BOBU_ADMIN_TEST_USER_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = v_user_id
      and admin_user.active = true
      and admin_user.role in ('owner', 'admin')
  ) then
    raise exception 'BOBU_ADMIN_TEST_ACCESS_NOT_AUTHORIZED';
  end if;

  if not exists (
    select 1
    from public.mars_advertisers as advertiser
    where advertiser.owner_builder_id = v_user_id
      and advertiser.status in ('under_review', 'active')
  ) then
    insert into public.mars_advertisers (
      owner_builder_id,
      display_name,
      advertiser_type,
      status
    )
    values (
      v_user_id,
      'BOBU Universe Admin Test',
      'personal',
      'under_review'
    );
  end if;
end
$$;
