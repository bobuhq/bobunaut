begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Mutation Access Enforcement v1
--
-- Central server-side enforcement for Mars participation.
--
-- Authenticated Builder mutations require permanent Mars access.
-- Service/backend operations without an end-user auth.uid()
-- are intentionally not blocked by this trigger.
--
-- Read-only Mars exploration remains available.
-- No GP side effects.
-- ============================================================


create or replace function public.enforce_mars_access_on_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Backend / migration / service operations have no end-user UID.
  -- They remain available for controlled system administration.
  if auth.uid() is null then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  perform public.assert_my_mars_access();

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;


revoke all
on function public.enforce_mars_access_on_mutation()
from public, anon, authenticated;


-- ------------------------------------------------------------
-- Colony lifecycle
-- ------------------------------------------------------------

drop trigger if exists
  enforce_mars_access_mars_colonies
on public.mars_colonies;

create trigger enforce_mars_access_mars_colonies
before insert or update or delete
on public.mars_colonies
for each row
execute function public.enforce_mars_access_on_mutation();


-- ------------------------------------------------------------
-- Membership lifecycle:
-- join request, approve/reject, leave, officer changes,
-- leadership membership changes.
-- ------------------------------------------------------------

drop trigger if exists
  enforce_mars_access_mars_colony_memberships
on public.mars_colony_memberships;

create trigger enforce_mars_access_mars_colony_memberships
before insert or update or delete
on public.mars_colony_memberships
for each row
execute function public.enforce_mars_access_on_mutation();


-- ------------------------------------------------------------
-- Sector participation
-- ------------------------------------------------------------

drop trigger if exists
  enforce_mars_access_mars_sector_assignments
on public.mars_colony_sector_assignments;

create trigger enforce_mars_access_mars_sector_assignments
before insert or update or delete
on public.mars_colony_sector_assignments
for each row
execute function public.enforce_mars_access_on_mutation();


comment on function public.enforce_mars_access_on_mutation() is
'Central BUILD MARS mutation guard. Authenticated Builder mutations require permanent Mars access.';


commit;
