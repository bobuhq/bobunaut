-- ============================================================
-- BOBU UNIVERSE
-- Auto create Builder Profile on signup
-- ============================================================

create or replace function public.handle_new_builder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  insert into public.builder_profiles (
    builder_id,
    level,
    xp,
    gp,
    reputation,
    referral_count
  )
  values (
    new.id,
    1,
    0,
    0,
    0,
    0
  )
  on conflict (builder_id)
  do nothing;

  return new;

end;
$$;


create trigger on_auth_user_created_builder
after insert on auth.users
for each row
execute function public.handle_new_builder();