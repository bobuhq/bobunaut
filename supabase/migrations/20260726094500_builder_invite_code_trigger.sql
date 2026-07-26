-- ============================================================
-- BOBU UNIVERSE
-- Builder Invite Code Auto Assignment
-- ============================================================

create or replace function public.assign_builder_invite_code()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.invite_code is null
     or char_length(trim(new.invite_code)) = 0
  then
    new.invite_code :=
      public.generate_builder_invite_code();
  end if;

  return new;
end;
$$;


create trigger builder_profiles_set_invite_code
before insert on public.builder_profiles
for each row
execute function public.assign_builder_invite_code();


revoke all on function public.assign_builder_invite_code()
from public, anon, authenticated;

grant execute on function public.assign_builder_invite_code()
to service_role;
