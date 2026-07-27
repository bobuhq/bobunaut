begin;

create or replace function public.handle_new_builder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_username text;
begin
  v_display_name := nullif(
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name'
    ),
    ''
  );

  v_username := nullif(
    coalesce(
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'preferred_username'
    ),
    ''
  );

  insert into public.builder_profiles (
    builder_id,
    username,
    display_name,
    level,
    xp,
    gp,
    reputation,
    referral_count
  )
  values (
    new.id,
    v_username,
    v_display_name,
    1,
    0,
    0,
    0,
    0
  )
  on conflict (builder_id)
  do update set
    username = coalesce(
      public.builder_profiles.username,
      excluded.username
    ),
    display_name = coalesce(
      public.builder_profiles.display_name,
      excluded.display_name
    );

  return new;
end;
$$;

update public.builder_profiles as profile
set
  display_name = coalesce(
    profile.display_name,
    nullif(
      coalesce(
        auth_user.raw_user_meta_data ->> 'name',
        auth_user.raw_user_meta_data ->> 'full_name'
      ),
      ''
    )
  ),
  username = coalesce(
    profile.username,
    nullif(
      coalesce(
        auth_user.raw_user_meta_data ->> 'user_name',
        auth_user.raw_user_meta_data ->> 'preferred_username'
      ),
      ''
    )
  )
from auth.users as auth_user
where profile.builder_id = auth_user.id
  and (
    profile.display_name is null
    or profile.username is null
  );

commit;
