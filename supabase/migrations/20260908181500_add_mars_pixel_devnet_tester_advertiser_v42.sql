begin;

do $$
declare
  v_user_id uuid;
begin
  select auth_user.id
  into v_user_id
  from auth.users as auth_user
  where lower(coalesce(auth_user.email, '')) = 'denyzcyber@gmail.com'
  limit 1;

  if v_user_id is null then
    raise exception 'MARS_PIXEL_DEVNET_TEST_USER_NOT_FOUND';
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
      'BOBU Devnet Test Advertiser',
      'personal',
      'under_review'
    );
  end if;
end
$$;

commit;
