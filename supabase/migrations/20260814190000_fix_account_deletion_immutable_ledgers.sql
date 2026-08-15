-- ============================================================
-- BOBU UNIVERSE
-- Production account deletion fix
--
-- Immutable GP ledgers must remain immutable to normal callers.
-- During an authenticated account deletion transaction only,
-- PostgreSQL CASCADE deletes are allowed to remove the user's
-- historical ledger rows.
-- ============================================================

create or replace function
public.prevent_network_gp_ledger_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_setting(
    'bobu.account_deletion',
    true
  ) = 'true' then
    return old;
  end if;

  raise exception
    'builder_network_gp_ledger cannot be mutated directly';
end;
$$;


create or replace function
public.prevent_reward_ledger_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  /*
   * Account deletion is the only controlled exception.
   * UPDATE remains blocked even during account deletion.
   */
  if TG_OP = 'DELETE'
     and current_setting(
       'bobu.account_deletion',
       true
     ) = 'true' then
    return old;
  end if;

  raise exception
    'builder_reward_ledger is immutable; update and delete operations are not allowed';
end;
$$;


-- Controlled account deletion entry point.
-- The caller must be the currently authenticated Builder.
create or replace function
public.delete_current_builder_account()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  /*
   * This flag is LOCAL to the current database transaction.
   * It cannot be enabled by a browser request and then reused
   * by another transaction.
   */
  perform set_config(
    'bobu.account_deletion',
    'true',
    true
  );

  /*
   * auth.users deletion triggers the existing production
   * foreign-key cascade chain.
   */
  delete from auth.users
  where id = current_user_id;

  if not found then
    raise exception 'Authenticated user was not found';
  end if;
end;
$$;


revoke all
on function public.delete_current_builder_account()
from public, anon;

grant execute
on function public.delete_current_builder_account()
to authenticated;
