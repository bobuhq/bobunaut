-- ============================================================
-- BOBU UNIVERSE
-- Builder Invite Code Generator
-- ============================================================

create or replace function public.generate_builder_invite_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
begin
  loop
    v_code :=
      'BOBU-' ||
      upper(substr(md5(random()::text), 1, 6));

    exit when not exists (
      select 1
      from public.builder_profiles
      where invite_code = v_code
    );
  end loop;

  return v_code;
end;
$$;


revoke all on function public.generate_builder_invite_code()
from public, anon, authenticated;

grant execute on function public.generate_builder_invite_code()
to service_role;
